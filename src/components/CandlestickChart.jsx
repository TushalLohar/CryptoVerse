import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
} from "lightweight-charts";

const TIMEFRAMES = [
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

async function fetchOHLCV(coinId, days, currency = "usd") {
  try {
    const res = await fetch(
      `/api/coingecko/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`,
    );

    if (!res.ok) throw new Error("failed");

    const data = await res.json();

    return data.map(([ts, o, h, l, c]) => ({
      time: Math.floor(ts / 1000),
      open: o,
      high: h,
      low: l,
      close: c,
    }));
  } catch {
    return null;
  }
}

async function fetchVolume(coinId, days, currency = "usd") {
  try {
    const interval = days <= 1 ? "minutely" : days <= 30 ? "hourly" : "daily";

    const res = await fetch(
      `/api/coingecko/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}&interval=${interval}`,
    );

    if (!res.ok) throw new Error("failed");

    const data = await res.json();

    return (data.total_volumes || []).map(([ts, vol]) => ({
      time: Math.floor(ts / 1000),
      value: vol,
    }));
  } catch {
    return null;
  }
}

export default function CandlestickChart({
  coinId,
  currency = "usd",
  height = 400,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const areaRef = useRef(null);
  const volumeRef = useRef(null);

  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState("candle");
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const isDark =
      document.documentElement.getAttribute("data-theme") !== "light";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,

      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#a0a8c0" : "#5a6080",
      },

      grid: {
        vertLines: {
          color: isDark ? "rgba(255,255,255,0.035)" : "#e5e7eb",
        },
        horzLines: {
          color: isDark ? "rgba(255,255,255,0.035)" : "#e5e7eb",
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,

        vertLine: {
          width: 1,
          color: "rgba(120,120,120,0.4)",
          style: 0,
          labelBackgroundColor: "#3d8ef8",
        },

        horzLine: {
          width: 1,
          color: "rgba(120,120,120,0.4)",
          style: 0,
          labelBackgroundColor: "#3d8ef8",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },

      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f43f5e",
      borderUpColor: "#22c55e",
      borderDownColor: "#f43f5e",
      wickUpColor: "#22c55e",
      wickDownColor: "#f43f5e",
    });

    candleRef.current = candleSeries;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#3d8ef8",
      topColor: "rgba(61,142,248,0.3)",
      bottomColor: "rgba(61,142,248,0)",
      visible: false,
    });

    areaRef.current = areaSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#3d8ef826",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setTooltip(null);
        return;
      }

      const candle = param.seriesData.get(candleSeries);
      const area = param.seriesData.get(areaSeries);
      const vol = param.seriesData.get(volumeSeries);

      if (candle) {
        setTooltip({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: vol?.value,
          isUp: candle.close >= candle.open,
        });
      } else if (area) {
        setTooltip({
          close: area.value,
          volume: vol?.value,
        });
      }
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });

    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [candles, volumes] = await Promise.all([
        fetchOHLCV(coinId, days, currency),
        fetchVolume(coinId, days, currency),
      ]);

      if (candles) {
        candleRef.current?.setData(candles);

        areaRef.current?.setData(
          candles.map((c) => ({
            time: c.time,
            value: c.close,
          })),
        );
      }

      if (volumes) {
        volumeRef.current?.setData(volumes);
      }

      chartRef.current?.timeScale().fitContent();

      setLoading(false);
    }

    loadData();
  }, [coinId, days, currency]);

  useEffect(() => {
    candleRef.current?.applyOptions({
      visible: chartType === "candle",
    });

    areaRef.current?.applyOptions({
      visible: chartType === "area",
    });
  }, [chartType]);

  /* FIX: update chart when theme changes */

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!chartRef.current) return;

      const isDark =
        document.documentElement.getAttribute("data-theme") !== "light";

      chartRef.current.applyOptions({
        layout: {
          textColor: isDark ? "#a0a8c0" : "#5a6080",
        },

        grid: {
          vertLines: {
            color: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
          },
          horzLines: {
            color: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
          },
        },

        rightPriceScale: {
          borderColor: isDark ? "#1e2235" : "#e8eaf0",
        },

        timeScale: {
          borderColor: isDark ? "#1e2235" : "#e8eaf0",
        },
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  function fmtPrice(p) {
    if (!p) return "—";

    if (p >= 10000)
      return `$${p.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`;

    if (p >= 1) return `$${p.toFixed(4)}`;

    return `$${p.toFixed(6)}`;
  }

  function fmtVol(v) {
    if (!v) return "—";

    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;

    return `$${v.toLocaleString()}`;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1 bg-bg-base border border-border rounded-lg p-1">
          {[
            { key: "candle", label: "🕯 Candles" },
            { key: "area", label: "📈 Line" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChartType(key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                chartType === key
                  ? "bg-bg-elevated text-text-1 shadow-sm"
                  : "text-text-3"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {TIMEFRAMES.map(({ label, days: d }) => (
            <button
              key={label}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs font-bold rounded-md border transition ${
                days === d
                  ? "border-crypto-blue text-crypto-blue bg-crypto-blue/10"
                  : "border-border text-text-3"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="flex gap-4 mb-2 flex-wrap">
          {tooltip.open != null && (
            <>
              <TooltipStat
                label="O"
                value={fmtPrice(tooltip.open)}
                color="text-text-2"
              />
              <TooltipStat
                label="H"
                value={fmtPrice(tooltip.high)}
                color="text-crypto-green"
              />
              <TooltipStat
                label="L"
                value={fmtPrice(tooltip.low)}
                color="text-crypto-red"
              />
            </>
          )}

          <TooltipStat
            label="C"
            value={fmtPrice(tooltip.close)}
            color={tooltip.isUp ? "text-crypto-green" : "text-crypto-red"}
          />

          {tooltip.volume && (
            <TooltipStat
              label="Vol"
              value={fmtVol(tooltip.volume)}
              color="text-text-3"
            />
          )}
        </div>
      )}

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-elevated rounded-lg text-text-3 text-sm z-10">
            Loading chart...
          </div>
        )}

        <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
      </div>
    </div>
  );
}

function TooltipStat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-text-4 text-[11px] font-semibold">{label}</span>
      <span className={`text-xs font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}
