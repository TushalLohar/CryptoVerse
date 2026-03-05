import { useState, useEffect } from 'react'
import { fetchMarkets } from '../utils/marketAPI'


export function useMarketData({ page = 1, perPage = 25, currency = 'usd' } = {}) {

  const [coins,   setCoins]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {

    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await fetchMarkets({
        page,
        perPage,
        currency,
        signal: controller.signal,  // pass to fetch so it can be cancelled
      })

      // If request was cancelled (component unmounted), do nothing
      if (controller.signal.aborted) return

      if (err) {
        setError(err)
      } else {
        setCoins(data || [])
      }

      setLoading(false)
    }

    load()

    return () => controller.abort()

  }, [page, perPage, currency])

  return { coins, loading, error }
}