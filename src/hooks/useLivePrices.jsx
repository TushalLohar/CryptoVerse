import { useState, useEffect, useRef } from 'react'

// Binance symbol map — CoinGecko IDs → Binance trading pairs
// Not every coin trades on Binance, so we only map the ones that do
const ID_TO_BINANCE = {
  bitcoin:          'btcusdt',
  ethereum:         'ethusdt',
  tether:           'usdtusdt',
  binancecoin:      'bnbusdt',
  ripple:           'xrpusdt',
  solana:           'solusdt',
  dogecoin:         'dogeusdt',
  cardano:          'adausdt',
  avalanche:        'avaxusdt',
  polkadot:         'dotusdt',
  chainlink:        'linkusdt',
  'matic-network':  'maticusdt',
  litecoin:         'ltcusdt',
  uniswap:          'uniusdt',
  'shiba-inu':      'shibusdt',
  tron:             'trxusdt',
  'the-open-network': 'tonusdt',
  'near-protocol':  'nearusdt',
  'internet-computer': 'icpusdt',
  cosmos:           'atomusdt',
  monero:           'xmrusdt',
  stellar:          'xlmusdt',
  aptos:            'aptusdt',
  sui:              'suiusdt',
  pepe:             'pepeusdt',
}

// Takes an array of coin objects from CoinGecko
// Returns a live prices map: { coinId: livePrice }
// Only works in USD (Binance USDT pairs)
export function useLivePrices(coins) {
  const [prices, setPrices] = useState({})
  const wsRef = useRef(null)

  useEffect(() => {
    if (!coins?.length) return

    // Build the list of Binance stream names for the coins we have
    // Only include coins we have a mapping for
    const streams = coins
      .map(c => ID_TO_BINANCE[c.id])
      .filter(Boolean)  // remove undefined
      .map(sym => `${sym}@miniTicker`)  // miniTicker = lightweight price stream
      .join('/')

    if (!streams) return

    // Close any existing connection before opening a new one
    if (wsRef.current) wsRef.current.close()

    // Binance multi-stream URL — subscribes to multiple tickers at once
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg  = JSON.parse(event.data)
      const data = msg.data  // miniTicker data is nested under .data

      if (!data) return

      // data.s = symbol (e.g. "BTCUSDT")
      // data.c = current/close price (as string)
      const symbol = data.s?.toLowerCase()  // "btcusdt"
      const price  = parseFloat(data.c)

      if (!symbol || isNaN(price)) return

      // Find which coinId this symbol belongs to
      const coinId = Object.keys(ID_TO_BINANCE).find(
        id => ID_TO_BINANCE[id] === symbol
      )

      if (!coinId) return

      // Update only if price actually changed
      // This prevents unnecessary re-renders
      setPrices(prev => {
        if (prev[coinId] === price) return prev
        return { ...prev, [coinId]: price }
      })
    }

    ws.onerror = (e) => console.warn('WebSocket error:', e)

    // Cleanup — close WebSocket when component unmounts
    // or when coins list changes (new page = new coins)
    return () => {
      ws.close()
      wsRef.current = null
    }

  }, [coins])
  // ^ re-run when coins array changes (page change gives us different coins)

  return prices
}