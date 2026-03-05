// src/utils/marketAPI.js

import {
  ApiClient,
  fetchCoinCapMarkets,
  fetchCoinCapPrices,
  isQuotaLow,
} from './apiClient'

import { getCachedChart, setCachedChart } from './indexedDbCharts'


// ─────────────────────────────────────────────────────────────
// CURRENCIES
// The five currencies the app supports
// symbol = displayed next to prices
// label  = shown in the currency picker dropdown
// ─────────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: 'usd', symbol: '$',  label: 'USD', flag: '🇺🇸' },
  { code: 'inr', symbol: '₹',  label: 'INR', flag: '🇮🇳' },
  { code: 'eur', symbol: '€',  label: 'EUR', flag: '🇪🇺' },
  { code: 'btc', symbol: '₿',  label: 'BTC', flag: '₿'   },
  { code: 'eth', symbol: 'Ξ',  label: 'ETH', flag: 'Ξ'   },
]

// CoinGecko's category IDs for the filter pills
export const CATEGORY_MAP = {
  'DeFi':        'decentralized-finance-defi',
  'Layer 1':     'layer-1',
  'Layer 2':     'layer-2',
  'Stablecoins': 'stablecoins',
  'Meme':        'meme-token',
  'Gaming':      'gaming',
  'AI':          'artificial-intelligence',
}


// ─────────────────────────────────────────────────────────────
// FORMATTERS
// Pure functions — take a value, return a formatted string
// ─────────────────────────────────────────────────────────────

// Format a number as currency
// Examples:
//   fmtCurrency(45230.5, 'usd') → '$45,230.50'
//   fmtCurrency(0.000045, 'usd') → '$0.00004500'
//   fmtCurrency(45230.5, 'inr') → '₹45,230.50'
export const fmtCurrency = (value, currency, compact = false) => {
  // Guard against null, undefined, or NaN
  if (value == null || isNaN(value)) return '—'

  // BTC and ETH are not standard Intl currencies, handle manually
  if (currency === 'btc') return `₿${value.toFixed(value < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${value.toFixed(value < 0.01  ? 6 : 4)}`

  // Intl.NumberFormat handles all real currencies automatically
  // maximumFractionDigits changes based on value size:
  //   very small numbers (< 0.001) → 8 decimal places
  //   small numbers (< 1)          → 6 decimal places
  //   medium numbers (< 100)       → 4 decimal places
  //   large numbers                → 2 decimal places
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              currency.toUpperCase(),
    maximumFractionDigits: value < 0.001 ? 8 : value < 1 ? 6 : value < 100 ? 4 : 2,
    // compact notation: 1,200,000,000 → $1.2B
    notation:              compact && Math.abs(value) >= 1e9 ? 'compact' : 'standard',
    compactDisplay:        'short',
  }).format(value)
}

// Format a percentage change
// fmtPct(2.45)  → '+2.45%'
// fmtPct(-1.2)  → '-1.20%'
export const fmtPct = (value) => {
  if (value == null || isNaN(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

// Format a large number with B/M/T suffix
// fmtLarge(1200000000) → '$1.20B'
export const fmtLarge = (value) => {
  if (!value) return '—'
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9)  return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6)  return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toLocaleString()}`
}


// ─────────────────────────────────────────────────────────────
// API FUNCTIONS
// Each function calls ApiClient with the right endpoint + params
// ─────────────────────────────────────────────────────────────

// Fetch paginated market list with CoinCap fallback
export const fetchMarkets = async ({
  page     = 1,
  perPage  = 25,
  currency = 'usd',
  category = null,
  signal,
} = {}) => {

  // If quota is low AND we're on USD (CoinCap only supports USD),
  // try CoinCap first to save our CoinGecko tokens
  if (isQuotaLow() && currency === 'usd' && !category) {
    const fallbackData = await fetchCoinCapMarkets(perPage * page)
    const slice = fallbackData.slice((page - 1) * perPage, page * perPage)
    if (slice.length) return { data: slice, error: null, status: 200, fromFallback: true }
  }

  const params = {
    vs_currency:              currency,
    order:                    'market_cap_desc',
    per_page:                 perPage,
    page,
    sparkline:                true,
    price_change_percentage:  '1h,24h,7d',
  }

  // Add category filter if not 'All'
  if (category && category !== 'All') {
    const categoryId = CATEGORY_MAP[category]
    if (categoryId) params.category = categoryId
  }

  const result = await ApiClient('/coins/markets', { params, ttlKey: 'markets', signal })

  // If CoinGecko returned 429, fall back to CoinCap
  if (result.status === 429 && currency === 'usd') {
    const fallbackData = await fetchCoinCapMarkets(perPage * page)
    const slice = fallbackData.slice((page - 1) * perPage, page * perPage)
    if (slice.length) return { data: slice, error: null, status: 200, fromFallback: true }
  }

  return result
}

// Fetch global market stats (total market cap, BTC dominance, etc.)
export const fetchGlobal = () =>
  ApiClient('/global', { ttlKey: 'global' })

// Fetch trending coins
export const fetchTrending = () =>
  ApiClient('/search/trending', { ttlKey: 'trending' })

// Fetch full detail for a single coin
export const fetchCoinDetail = (id) =>
  ApiClient(`/coins/${id}`, {
    params: {
      localization:     false,
      tickers:          true,
      market_data:      true,
      community_data:   true,
      developer_data:   false,
      sparkline:        true,
    },
    ttlKey: 'coin',
  })

// Fetch price chart data with IndexedDB caching
// We use a separate IndexedDB store for charts because
// chart data is large and has different TTL needs
export const fetchChart = async (id, currency = 'usd', days = 7) => {
  const cacheKey = `${id}:${currency}:${days}`

  // Chart data: 1 day = refresh after 1 min, others = 5 min
  const maxAge = days === 1 ? 60_000 : 300_000

  const cached = await getCachedChart(cacheKey, maxAge)
  if (cached) return { data: cached, error: null, status: 200, fromCache: true }

  const result = await ApiClient(`/coins/${id}/market_chart`, {
    params:  { vs_currency: currency, days },
    ttlKey:  'chart',
    fresh:   true,  // always fetch fresh for charts (we handle caching ourselves above)
  })

  if (result.data) await setCachedChart(cacheKey, result.data)
  return result
}

// Fetch OHLC (candlestick) data
export const fetchOHLC = async (id, currency = 'usd', days = 7) => {
  const cacheKey = `ohlc:${id}:${currency}:${days}`
  const maxAge   = days === 1 ? 60_000 : 300_000

  const cached = await getCachedChart(cacheKey, maxAge)
  if (cached) return { data: cached, error: null, status: 200, fromCache: true }

  const result = await ApiClient(`/coins/${id}/ohlc`, {
    params: { vs_currency: currency, days },
    ttlKey: 'chart',
    fresh:  true,
  })

  if (result.data) await setCachedChart(cacheKey, result.data)
  return result
}

// Search coins by name or symbol
export const fetchSearch = (query) =>
  query?.length >= 2
    ? ApiClient('/search', { params: { query }, ttlKey: 'search' })
    : Promise.resolve({ data: null })

// Fetch prices for multiple coins (used by Portfolio and Watchlist)
export const fetchPortfolioCoins = async (ids, currency = 'usd') => {
  if (!ids?.length) return { data: [] }

  const result = await ApiClient('/coins/markets', {
    params: {
      vs_currency:             currency,
      ids:                     ids.join(','),
      sparkline:               false,
      price_change_percentage: '1h,24h,7d',
    },
    ttlKey: 'markets',
  })

  // Fallback for portfolio coins if CoinGecko fails
  if ((result.status === 429 || !result.data) && currency === 'usd') {
    const prices = await fetchCoinCapPrices(ids)
    if (Object.keys(prices).length) {
      return {
        data: ids.map((id) => ({
          id,
          current_price: prices[id] ?? null,
          _source:       'coincap',
        })),
        error:        null,
        status:       200,
        fromFallback: true,
      }
    }
  }

  return result
}

// Fetch exchange tickers for a coin (shown in Exchanges tab)
export const fetchTickers = (id) =>
  ApiClient(`/coins/${id}/tickers`, {
    params: {
      include_exchange_logo: true,
      per_page:              10,
      order:                 'volume_desc',
    },
    ttlKey: 'default',
  })

// Fetch Fear & Greed index (from alternative.me, not CoinGecko)
// This uses plain fetch — no proxy needed, no key needed
export const fetchFearGreed = async () => {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=30')
    const json     = await response.json()
    return json?.data || []
  } catch {
    return []
  }
}

// Fetch top gainers and losers in 24h
export const fetchGainersLosers = async (currency = 'usd') => {
  const { data } = await ApiClient('/coins/markets', {
    params: {
      vs_currency:             currency,
      order:                   'market_cap_desc',
      per_page:                250,
      page:                    1,
      sparkline:               false,
      price_change_percentage: '24h',
    },
    ttlKey: 'markets',
  })

  if (!data) return { gainers: [], losers: [] }

  // Sort by 24h change descending
  const sorted = [...data].sort(
    (a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
  )

  return {
    gainers: sorted.filter((c) => c.price_change_percentage_24h > 0).slice(0, 10),
    losers:  sorted.filter((c) => c.price_change_percentage_24h < 0).reverse().slice(0, 10),
  }
}