import { useState, useEffect } from 'react'
import { fetchChart } from '../utils/marketAPI'

export function useChart(id, currency, days) {
  const [chartData, setChartData] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await fetchChart(id, currency, days)

      if (err) {
        setError(err)
      } else {
        // CoinGecko returns prices as [[timestamp, price], [timestamp, price], ...]
        // We convert to [{ time, price }, ...] for Recharts
        setChartData(
          (data?.prices || []).map(([timestamp, price]) => ({
            time:  timestamp,
            price: price,
          }))
        )
      }
      setLoading(false)
    }

    load()
  }, [id, currency, days])

  return { chartData, loading, error }
}