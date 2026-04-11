/* eslint-disable react-refresh/only-export-components */
const CG_BASE = "/api/coingecko";
export const TTL = {
  markets: 30_000,
  global: 60_000,
  trending: 300_000,
  chart: 120_000,
  coin: 30_000,
  search: 120_000,
  default: 60_000,
};

const HARD_TTL = {
  markets: 300_000,
  global: 600_000,
  chart: 900_000,
  default: 600_000,
};
const IDB_NAME = "ct_api_v2";
const IDB_STORE = "resp";

let _db = null;

const openDB = () => {
  if (_db) return _db;

  _db = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "k" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return _db;
};

const idbGet = async (key) => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(IDB_STORE, "readonly")
        .objectStore(IDB_STORE)
        .get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const idbSet = async (key, value, timestamp) => {
  try {
    const db = await openDB();

    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ k: key, v: value, ts: timestamp });
  } catch {
    /* empty */
  }
};
const memCache = new Map();

const MEM_LIMIT = 200;

const setMemCache = (key, value) => {
  if (memCache.size > MEM_LIMIT) {
    const firstKey = memCache.keys().next().value;
    memCache.delete(firstKey);
  }
  memCache.set(key, value);
};
const inFlight = new Map();
const RATE = 25;
const WINDOW = 60_000;

let tokens = RATE;
let lastRefill = Date.now();

const waitQueue = [];

const refill = () => {
  const now = Date.now();
  const elapsed = now - lastRefill;

  const tokensToAdd = Math.floor((elapsed / WINDOW) * RATE);

  if (tokensToAdd > 0) {
    tokens = Math.min(RATE, tokens + tokensToAdd);
    lastRefill = now;
  }
};

const drainQueue = () => {
  refill();

  while (waitQueue.length > 0 && tokens > 0) {
    tokens--;
    waitQueue.shift().resolve();
  }
};

const acquireToken = () =>
  new Promise((resolve) => {
    refill();

    if (tokens > 0) {
      tokens--;
      resolve();
      return;
    }

    waitQueue.push({ resolve });

    setTimeout(drainQueue, Math.ceil(WINDOW / RATE) + 50);
  });
let isTabVisible = !document.hidden;

document.addEventListener("visibilitychange", () => {
  isTabVisible = !document.hidden;
  if (isTabVisible) drainQueue();
});
const fetchWithBackoff = async (url, signal, attempt = 0) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: signal || controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      if (attempt >= 3) {
        return { data: null, error: "Rate limit exceeded", status: 429 };
      }

      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));

      return fetchWithBackoff(url, signal, attempt + 1);
    }

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: await response.json(),
      error: null,
      status: response.status,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      return { data: null, error: "Cancelled", isAborted: true };
    }

    return { data: null, error: "Network error", status: 0 };
  }
};
const revalidate = async (url) => {
  try {
    if (tokens < 2) return;

    await acquireToken();

    const res = await fetch(url);

    if (!res.ok) return;

    const data = await res.json();
    const ts = Date.now();

    setMemCache(url, { data, ts, revalidating: false });
    idbSet(url, data, ts);
  } catch {
    const cached = memCache.get(url);
    if (cached) cached.revalidating = false;
  }
};
export const ApiClient = async (
  endpoint,
  { params = {}, ttlKey = "default", signal, fresh = false } = {},
) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== ""),
  ).toString();

  const url = `${CG_BASE}${endpoint}${queryString ? `?${queryString}` : ""}`;
  const softTTL = TTL[ttlKey] ?? TTL.default;
  const hardTTL = HARD_TTL[ttlKey] ?? HARD_TTL.default;
  const now = Date.now();

  if (!fresh) {
    const cached = memCache.get(url);

    if (cached) {
      const age = now - cached.ts;

      if (age < hardTTL) {
        if (age > softTTL && !cached.revalidating && isTabVisible) {
          cached.revalidating = true;
          revalidate(url);
        }

        return { data: cached.data, error: null, status: 200, fromCache: true };
      }
    }

    const persisted = await idbGet(url);

    if (persisted && now - persisted.ts < hardTTL) {
      setMemCache(url, {
        data: persisted.v,
        ts: persisted.ts,
        revalidating: false,
      });

      return { data: persisted.v, error: null, status: 200, fromCache: true };
    }
  }

  if (inFlight.has(url)) {
    return inFlight.get(url);
  }

  const promise = (async () => {
    if (!signal?.aborted) await acquireToken();

    const result = await fetchWithBackoff(url, signal);

    if (result.data) {
      const ts = Date.now();

      setMemCache(url, { data: result.data, ts, revalidating: false });

      idbSet(url, result.data, ts);
    }

    inFlight.delete(url);

    return result;
  })();

  inFlight.set(url, promise);

  return promise;
};
export const getRateLimitStatus = () => {
  refill();

  return {
    tokens,
    queued: waitQueue.length,
    limit: RATE,
  };
};

export const isQuotaLow = () => {
  refill();
  return tokens < 5;
};
const COINCAP_BASE = "https://api.coincap.io/v2";

export const fetchCoinCapMarkets = async (limit = 50) => {
  try {
    const response = await fetch(`${COINCAP_BASE}/assets?limit=${limit}`);
    const json = await response.json();

    return (json?.data || []).map((asset) => ({
      id: asset.id,
      symbol: asset.symbol?.toLowerCase(),
      name: asset.name,
      image: `https://assets.coincap.io/assets/icons/${asset.symbol?.toLowerCase()}@2x.png`,
      current_price: parseFloat(asset.priceUsd) || 0,
      market_cap: parseFloat(asset.marketCapUsd) || 0,
      market_cap_rank: parseInt(asset.rank) || 999,
      total_volume: parseFloat(asset.volumeUsd24Hr) || 0,
      price_change_percentage_24h: parseFloat(asset.changePercent24Hr) || 0,
      circulating_supply: parseFloat(asset.supply) || 0,
      sparkline_in_7d: null,
      _source: "coincap",
    }));
  } catch {
    return [];
  }
};
const BINANCE_BASE = "https://api.binance.com/api/v3";

export const fetchBinanceTicker = async (symbol) => {
  try {
    const res = await fetch(
      `${BINANCE_BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`,
    );

    if (!res.ok) return null;

    const json = await res.json();

    return {
      price: parseFloat(json.lastPrice),
      change24h: parseFloat(json.priceChangePercent),
      volume: parseFloat(json.quoteVolume),
      high24h: parseFloat(json.highPrice),
      low24h: parseFloat(json.lowPrice),
    };
  } catch {
    return null;
  }
};

export const fetchBinanceKlines = async (
  symbol,
  interval = "1h",
  limit = 168,
) => {
  try {
    const res = await fetch(
      `${BINANCE_BASE}/klines?symbol=${symbol.toUpperCase()}USDT&interval=${interval}&limit=${limit}`,
    );

    if (!res.ok) return [];

    const raw = await res.json();

    return raw.map((candle) => ({
      time: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  } catch {
    return [];
  }
};
export const fetchCoinCapPrices = async (ids = []) => {
  try {
    const response = await fetch(
      `https://api.coincap.io/v2/assets?ids=${ids.join(",")}&limit=100`,
    );

    const json = await response.json();

    const priceMap = {};

    (json?.data || []).forEach((asset) => {
      priceMap[asset.id] = parseFloat(asset.priceUsd);
    });

    return priceMap;
  } catch {
    return {};
  }
};
