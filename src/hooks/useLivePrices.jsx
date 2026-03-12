import { useState, useEffect, useRef } from "react"

const ID_TO_BINANCE = {
  bitcoin: "btcusdt",
  ethereum: "ethusdt",
  binancecoin: "bnbusdt",
  ripple: "xrpusdt",
  solana: "solusdt",
  dogecoin: "dogeusdt",
  cardano: "adausdt",
  avalanche: "avaxusdt",
  polkadot: "dotusdt",
  chainlink: "linkusdt",
  "matic-network": "maticusdt",
  litecoin: "ltcusdt",
  uniswap: "uniusdt",
  "shiba-inu": "shibusdt",
  tron: "trxusdt",
  "the-open-network": "tonusdt",
  "near-protocol": "nearusdt",
  "internet-computer": "icpusdt",
  cosmos: "atomusdt",
  monero: "xmrusdt",
  stellar: "xlmusdt",
  aptos: "aptusdt",
  sui: "suiusdt",
  pepe: "pepeusdt",
}

export function useLivePrices(coins) {

  const [prices, setPrices] = useState({})
  const wsRef = useRef(null)

  useEffect(() => {

    if (!coins?.length) return

    const streams = coins
      .map((c) => ID_TO_BINANCE[c.id])
      .filter(Boolean)
      .map((sym) => `${sym}@miniTicker`)
      .join("/")

    if (!streams) return

    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`
    )

    wsRef.current = ws

    ws.onmessage = (event) => {

      const msg = JSON.parse(event.data)
      const data = msg.data

      if (!data) return

      const symbol = data.s?.toLowerCase()
      const price = parseFloat(data.c)

      if (!symbol || isNaN(price)) return

      const coinId = Object.keys(ID_TO_BINANCE).find(
        (id) => ID_TO_BINANCE[id] === symbol
      )

      if (!coinId) return

      setPrices((prev) => {
        if (prev[coinId] === price) return prev
        return { ...prev, [coinId]: price }
      })
    }

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err)
    }

    ws.onclose = () => {
      wsRef.current = null
    }

    return () => {
      ws.close()
    }

  }, [coins])

  return prices
}