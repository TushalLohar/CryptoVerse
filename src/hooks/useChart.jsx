import { useState, useEffect } from "react";
import { fetchChart } from "../utils/marketAPI";

export function useChart(id, currency, days) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await fetchChart(id, currency, days);

      if (cancelled) return;

      if (err) {
        setError(err);
      } else {
        const prices = data?.prices || [];

        setChartData(
          prices.map(([timestamp, price]) => ({
            time: timestamp,
            price: price,
          })),
        );
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, currency, days]);

  return { chartData, loading, error };
}
