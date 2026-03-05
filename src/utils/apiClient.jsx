// src/utils/apiClient.js

// ─────────────────────────────────────────────────────────────
// BASE URL
// Because we set up the proxy in vite.config.js,
// /api/coingecko gets rewritten to https://api.coingecko.com/api/v3
// The API key is injected by the proxy — never touches the browser
// ─────────────────────────────────────────────────────────────
const CG_BASE = '/api/coingecko'


// ─────────────────────────────────────────────────────────────
// TTL CONFIGURATION (Time To Live — how long cache is valid)
//
// Each endpoint type has different "freshness" requirements:
// - markets data changes every few seconds → short TTL
// - trending coins change every hour → longer TTL
// ─────────────────────────────────────────────────────────────
export const TTL = {
  markets:  30_000,    // 30 seconds — prices change fast
  global:   60_000,    // 1 minute
  trending: 300_000,   // 5 minutes — trending changes slowly
  chart:    120_000,   // 2 minutes
  coin:     30_000,    // 30 seconds
  search:   120_000,   // 2 minutes — search results are stable
  default:  60_000,    // 1 minute fallback
}

// Hard TTL — older than this = show skeleton, don't show stale data
const HARD_TTL = {
  markets:  300_000,   // 5 minutes
  global:   600_000,   // 10 minutes
  chart:    900_000,   // 15 minutes
  default:  600_000,   // 10 minutes
}


// ─────────────────────────────────────────────────────────────
// INDEXEDDB SETUP
//
// IndexedDB is async and uses events (not promises) natively.
// We wrap it in promises to make it easier to use with async/await.
//
// Database name: ct_api_v2
// Store name: resp (short for "responses")
// Each record: { k: url, v: data, ts: timestamp }
// ─────────────────────────────────────────────────────────────
const IDB_NAME  = 'ct_api_v2'
const IDB_STORE = 'resp'

// _db holds the database connection once opened
// We open it once and reuse the connection
let _db = null

const openDB = () => {
  // If already opened, return the existing promise
  if (_db) return _db

  _db = new Promise((resolve, reject) => {
    // indexedDB.open(name, version) — if version is new, onupgradeneeded fires
    const request = indexedDB.open(IDB_NAME, 1)

    // This fires when the database is created for the first time
    // or when we bump the version number
    request.onupgradeneeded = () => {
      const db = request.result
      // Create the object store if it doesn't exist
      // keyPath: 'k' means the 'k' field is the unique ID
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'k' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror   = () => reject(request.error)
  })

  return _db
}

// Read a value from IndexedDB by key (the URL)
const idbGet = async (key) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      // 'readonly' transaction — we're just reading
      const request = db
        .transaction(IDB_STORE, 'readonly')
        .objectStore(IDB_STORE)
        .get(key)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror   = () => reject(request.error)
    })
  } catch {
    // If IndexedDB fails for any reason, just return null
    // The app continues working, just without persistence
    return null
  }
}

// Write a value to IndexedDB
const idbSet = async (key, value, timestamp) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      // 'readwrite' transaction — we're writing
      const request = db
        .transaction(IDB_STORE, 'readwrite')
        .objectStore(IDB_STORE)
        .put({ k: key, v: value, ts: timestamp })  // put = insert or update

      request.onsuccess = () => resolve()
      request.onerror   = () => reject(request.error)
    })
  } catch {
    // Silent failure — caching is best-effort, not critical
  }
}


// ─────────────────────────────────────────────────────────────
// IN-MEMORY CACHE
//
// This is just a JavaScript Map (like an object but better for
// frequent add/delete operations).
//
// Key   = full URL string
// Value = { data, ts (timestamp), revalidating (bool) }
//
// Why both memory AND IndexedDB?
// - Memory: instant (0ms lookup), lost on page refresh
// - IndexedDB: ~1-2ms lookup, survives page refresh
// ─────────────────────────────────────────────────────────────
const memCache = new Map()


// ─────────────────────────────────────────────────────────────
// IN-FLIGHT DEDUPLICATION
//
// Problem: 5 components mount at the same time, all call
// ApiClient('/coins/markets', ...) simultaneously.
// Without deduplication → 5 network requests.
// With deduplication → 1 network request, all 5 get the result.
//
// How: store the in-progress Promise in a Map.
// Any new caller for the same URL gets the SAME Promise back.
// When it resolves, all callers get the result simultaneously.
// ─────────────────────────────────────────────────────────────
const inFlight = new Map()


// ─────────────────────────────────────────────────────────────
// TOKEN BUCKET RATE LIMITER
//
// RATE   = max tokens in the bucket (28 = slightly under 30 limit)
// WINDOW = 1 minute in milliseconds
//
// tokens     = how many requests we can make right now
// lastRefill = when we last added tokens to the bucket
// waitQueue  = requests waiting because bucket is empty
// ─────────────────────────────────────────────────────────────
const RATE   = 28
const WINDOW = 60_000

let tokens     = RATE
let lastRefill = Date.now()
const waitQueue = []

// Refill the bucket based on how much time has passed
// Example: if 30 seconds passed = 14 tokens added (half a window)
const refill = () => {
  const now  = Date.now()
  const elapsed = now - lastRefill

  // How many tokens to add: proportional to elapsed time
  const tokensToAdd = Math.floor((elapsed / WINDOW) * RATE)

  if (tokensToAdd > 0) {
    // Math.min prevents going over RATE
    tokens     = Math.min(RATE, tokens + tokensToAdd)
    lastRefill = now
  }
}

// Try to process queued requests after a refill
const drainQueue = () => {
  refill()
  // Process as many queued requests as we have tokens for
  while (waitQueue.length > 0 && tokens > 0) {
    tokens--
    waitQueue.shift().resolve()  // .shift() removes first item, .resolve() unblocks it
  }
}

// Call this before every request — waits until a token is available
const acquireToken = () => new Promise((resolve) => {
  refill()

  if (tokens > 0) {
    // Token available → take it immediately
    tokens--
    resolve()
    return
  }

  // No tokens → add to queue
  // The resolve function is stored so drainQueue() can call it later
  waitQueue.push({ resolve })

  // Schedule a drain after one token's worth of time
  // This ensures the queue doesn't sit forever
  setTimeout(drainQueue, Math.ceil(WINDOW / RATE) + 50)
})


// ─────────────────────────────────────────────────────────────
// VISIBILITY AWARENESS
//
// When the user switches to another tab, we pause background
// revalidation. No point refreshing data nobody is looking at.
// When they come back, we immediately drain the queue.
// ─────────────────────────────────────────────────────────────
let isTabVisible = !document.hidden

document.addEventListener('visibilitychange', () => {
  isTabVisible = !document.hidden
  if (isTabVisible) drainQueue()  // resume processing when tab becomes active
})


// ─────────────────────────────────────────────────────────────
// FETCH WITH EXPONENTIAL BACKOFF
//
// If we get a 429 (rate limited), we wait and retry.
// Exponential backoff: wait 1s, then 2s, then 4s (2^attempt seconds)
// After 3 attempts we give up and return the error.
// ─────────────────────────────────────────────────────────────
const fetchWithBackoff = async (url, signal, attempt = 0) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,  // AbortController signal — if component unmounts, request is cancelled
    })

    // 429 = Too Many Requests — wait and retry
    if (response.status === 429) {
      if (attempt >= 3) {
        return { data: null, error: 'Rate limit exceeded', status: 429 }
      }
      // 2^0 = 1s, 2^1 = 2s, 2^2 = 4s
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
      return fetchWithBackoff(url, signal, attempt + 1)
    }

    // Other error status codes
    if (!response.ok) {
      const messages = {
        400: 'Bad request',
        401: 'Invalid API key',
        404: 'Not found',
        500: 'Server error',
      }
      return {
        data: null,
        error: messages[response.status] ?? `HTTP ${response.status}`,
        status: response.status,
      }
    }

    // Success
    return { data: await response.json(), error: null, status: response.status }

  } catch (err) {
    // AbortError = component unmounted and cancelled the request
    // This is normal and expected, not an actual error
    if (err.name === 'AbortError') {
      return { data: null, error: 'Cancelled', isAborted: true }
    }
    return { data: null, error: err.message || 'Network error', status: 0 }
  }
}


// ─────────────────────────────────────────────────────────────
// BACKGROUND REVALIDATION
//
// When data is "stale" (past soft TTL but before hard TTL),
// we serve it from cache immediately AND quietly fetch fresh data.
// When fresh data arrives, we update the cache silently.
// The user never sees a loading state — they just see data,
// and next render it's slightly fresher.
// ─────────────────────────────────────────────────────────────
const revalidate = async (url, ttlKey) => {
  try {
    await acquireToken()

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return

    const data = await response.json()
    const ts   = Date.now()

    // Update both caches silently
    memCache.set(url, { data, ts, revalidating: false })
    idbSet(url, data, ts)

  } catch {
    // Background revalidation failure is silent
    // User still has the stale data, which is fine
    const cached = memCache.get(url)
    if (cached) cached.revalidating = false
  }
}


// ─────────────────────────────────────────────────────────────
// MAIN API CLIENT
//
// This is what every hook and component calls.
//
// Parameters:
//   endpoint  = '/coins/markets' (just the path, no base URL)
//   params    = { vs_currency: 'usd', per_page: 25 } (query params)
//   ttlKey    = 'markets' (which TTL config to use)
//   signal    = AbortController signal (optional, for cancellation)
//   fresh     = true means skip cache, always fetch new data
// ─────────────────────────────────────────────────────────────
export const ApiClient = async (
  endpoint,
  { params = {}, ttlKey = 'default', signal, fresh = false } = {}
) => {
  // Build query string from params object
  // Object.entries converts { a: 1, b: 2 } → [['a',1],['b',2]]
  // filter removes null/empty values so we don't send ?category=
  // URLSearchParams turns it into 'a=1&b=2'
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString()

  const url      = `${CG_BASE}${endpoint}${queryString ? `?${queryString}` : ''}`
  const softTTL  = TTL[ttlKey]      ?? TTL.default
  const hardTTL  = HARD_TTL[ttlKey] ?? HARD_TTL.default
  const now      = Date.now()

  // ── STEP 1: Check memory cache (if not forcing fresh) ──────
  if (!fresh) {
    const cached = memCache.get(url)

    if (cached) {
      const age = now - cached.ts

      if (age < hardTTL) {
        // Data is within hard TTL — we can use it

        // If past soft TTL and tab is visible and not already revalidating
        // → trigger a background refresh (fire and forget)
        if (age > softTTL && !cached.revalidating && isTabVisible) {
          cached.revalidating = true
          revalidate(url, ttlKey)  // no await — runs in background
        }

        return { data: cached.data, error: null, status: 200, fromCache: true }
      }
    }

    // ── STEP 2: Check IndexedDB cache ──────────────────────
    const persisted = await idbGet(url)

    if (persisted && (now - persisted.ts) < hardTTL) {
      // Warm the memory cache from IDB so next access is instant
      memCache.set(url, { data: persisted.v, ts: persisted.ts, revalidating: false })

      if ((now - persisted.ts) > softTTL && isTabVisible) {
        memCache.get(url).revalidating = true
        revalidate(url, ttlKey)
      }

      return { data: persisted.v, error: null, status: 200, fromCache: true }
    }
  }

  // ── STEP 3: Deduplication ─────────────────────────────────
  // If the same URL is already being fetched, return that promise
  // All callers share one network request
  if (inFlight.has(url)) {
    return inFlight.get(url)
  }

  // ── STEP 4: Acquire token + fetch ────────────────────────
  const promise = (async () => {
    // Wait for a rate limit token
    if (!signal?.aborted) await acquireToken()
    if (signal?.aborted) return { data: null, error: 'Cancelled', isAborted: true }

    const result = await fetchWithBackoff(url, signal)

    // On success, populate both caches
    if (result.data) {
      const ts = Date.now()
      memCache.set(url, { data: result.data, ts, revalidating: false })
      idbSet(url, result.data, ts)  // no await — fire and forget
    }

    inFlight.delete(url)  // remove from in-flight map
    return result
  })()

  // Register this promise so other callers can share it
  inFlight.set(url, promise)
  return promise
}


// ─────────────────────────────────────────────────────────────
// RATE LIMIT STATUS
// Used by RateLimitBadge component to show token count in header
// ─────────────────────────────────────────────────────────────
export const getRateLimitStatus = () => {
  refill()
  return {
    tokens,
    queued: waitQueue.length,
    limit:  RATE,
  }
}

// Returns true if we're running low on tokens
// Used by marketAPI.js to decide whether to use CoinCap fallback
export const isQuotaLow = () => {
  refill()
  return tokens < 5
}


// ─────────────────────────────────────────────────────────────
// COINCAP FALLBACK
//
// CoinCap is a free API with no key required, 200 req/min limit.
// We use it when CoinGecko is rate-limited or returns 429.
//
// The data shape is different from CoinGecko, so we normalize it
// to match — that way the rest of the app doesn't need to care
// which source the data came from.
// ─────────────────────────────────────────────────────────────
const COINCAP_BASE = 'https://api.coincap.io/v2'

export const fetchCoinCapMarkets = async (limit = 50) => {
  try {
    const response = await fetch(`${COINCAP_BASE}/assets?limit=${limit}`)
    const json     = await response.json()

    // Normalize CoinCap shape → CoinGecko shape
    return (json?.data || []).map((asset) => ({
      id:                           asset.id,
      symbol:                       asset.symbol?.toLowerCase(),
      name:                         asset.name,
      // CoinCap doesn't have images, so we construct a URL from their CDN
      image:                        `https://assets.coincap.io/assets/icons/${asset.symbol?.toLowerCase()}@2x.png`,
      current_price:                parseFloat(asset.priceUsd)        || 0,
      market_cap:                   parseFloat(asset.marketCapUsd)    || 0,
      market_cap_rank:              parseInt(asset.rank)              || 999,
      total_volume:                 parseFloat(asset.volumeUsd24Hr)   || 0,
      price_change_percentage_24h:  parseFloat(asset.changePercent24Hr) || 0,
      circulating_supply:           parseFloat(asset.supply)          || 0,
      sparkline_in_7d:              null,  // CoinCap doesn't provide sparklines
      _source:                      'coincap',  // flag so we know where data came from
    }))
  } catch {
    return []  // if fallback also fails, return empty array
  }
}

// Fetch prices for specific coin IDs from CoinCap
// Used as fallback in fetchPortfolioCoins
export const fetchCoinCapPrices = async (ids = []) => {
  try {
    const response = await fetch(`${COINCAP_BASE}/assets?ids=${ids.join(',')}&limit=100`)
    const json     = await response.json()

    // Return a map of { coinId: priceInUsd }
    const priceMap = {}
    ;(json?.data || []).forEach((asset) => {
      priceMap[asset.id] = parseFloat(asset.priceUsd)
    })
    return priceMap
  } catch {
    return {}
  }
}


// ─────────────────────────────────────────────────────────────
// BINANCE REST API (free, no key required)
// Used for candlestick/OHLC data and ticker info
// ─────────────────────────────────────────────────────────────
const BINANCE_BASE = 'https://api.binance.com/api/v3'

// Fetch 24h ticker data for a symbol (e.g. 'BTC' → 'BTCUSDT')
export const fetchBinanceTicker = async (symbol) => {
  try {
    const response = await fetch(
      `${BINANCE_BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`
    )
    const json = await response.json()
    return {
      price:    parseFloat(json.lastPrice),
      change24h: parseFloat(json.priceChangePercent),
      volume:   parseFloat(json.quoteVolume),
      high24h:  parseFloat(json.highPrice),
      low24h:   parseFloat(json.lowPrice),
    }
  } catch {
    return null
  }
}

// Fetch candlestick (OHLC) data
// interval: '1h', '4h', '1d' etc.
// limit: number of candles
export const fetchBinanceKlines = async (symbol, interval = '1h', limit = 168) => {
  try {
    const response = await fetch(
      `${BINANCE_BASE}/klines?symbol=${symbol.toUpperCase()}USDT&interval=${interval}&limit=${limit}`
    )
    const raw = await response.json()

    // Binance returns arrays: [openTime, open, high, low, close, volume, ...]
    // We convert to named objects
    return raw.map((candle) => ({
      time:   candle[0],              // open timestamp in ms
      open:   parseFloat(candle[1]),
      high:   parseFloat(candle[2]),
      low:    parseFloat(candle[3]),
      close:  parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }))
  } catch {
    return []
  }
}