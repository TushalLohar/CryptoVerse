import { useState, useEffect } from "react"
import { fetchMarkets } from "../utils/marketAPI"

export function useMarketData({ page = 1, perPage = 25, currency = "usd" } = {}) {

  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {

    const controller = new AbortController()

    async function load() {

      setLoading(true)
      setError(null)

      const { data, error } = await fetchMarkets({
        page,
        perPage,
        currency,
        signal: controller.signal,
        fresh: true
      })

      if (controller.signal.aborted) return

      if (error) setError(error)
      else setCoins(data || [])

      setLoading(false)

    }

    load()

    return () => controller.abort()

  }, [page, perPage, currency])

  return { coins, loading, error }

}