import { useState, useEffect } from "react";
import { fetchCoinDetail } from "../utils/marketAPI";

export function useCoinDetail(id) {
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await fetchCoinDetail(id);

      if (cancelled) return;

      if (err) {
        setError(err);
      } else {
        setCoin(data);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { coin, loading, error };
}
