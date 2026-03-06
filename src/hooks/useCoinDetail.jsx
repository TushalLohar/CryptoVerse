import { useState, useEffect } from 'react'
import { fetchCoinDetail } from '../utils/marketAPI'

export function useCoinDetail(id) {
  const [coin,    setCoin]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: err } = await fetchCoinDetail(id)

      if (controller.signal.aborted) return

      if (err) setError(err)
      else     setCoin(data)

      setLoading(false)
    }

    load()
    return () => controller.abort()

  }, [id])  // re-fetch whenever the coin id changes

  return { coin, loading, error }
}