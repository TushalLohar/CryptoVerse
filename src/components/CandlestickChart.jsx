import { useEffect, useRef, useState } from 'react'
import {
  createChart, ColorType, CrosshairMode,
  CandlestickSeries, AreaSeries, HistogramSeries,
} from 'lightweight-charts'

const TIMEFRAMES = [
  { label: '1D',  days: 1   },
  { label: '7D',  days: 7   },
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '1Y',  days: 365 },
]

async function fetchOHLCV(coinId, days, currency = 'usd') {
  try {
    const res = await fetch(
      `/api/coingecko/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`
    )
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return data.map(([ts, o, h, l, c]) => ({
      time: Math.floor(ts / 1000),
      open: o, high: h, low: l, close: c,
    }))
  } catch {
    return null
  }
}

async function fetchVolume(coinId, days, currency = 'usd') {
  try {
    const interval = days <= 1 ? 'minutely' : days <= 30 ? 'hourly' : 'daily'
    const res = await fetch(
      `/api/coingecko/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}&interval=${interval}`
    )
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return (data.total_volumes || []).map(([ts, vol]) => ({
      time: Math.floor(ts / 1000), value: vol,
    }))
  } catch {
    return null
  }
}

export default function CandlestickChart({ coinId, currency = 'usd', height = 400 }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const candleRef    = useRef(null)
  const volumeRef    = useRef(null)
  const areaRef      = useRef(null)

  const [days,       setDays]       = useState(30)
  const [chartType,  setChartType]  = useState('candle')
  const [loading,    setLoading]    = useState(true)
  const [tooltip,    setTooltip]    = useState(null)
  const [chartReady, setChartReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor:  isDark ? '#a0a8c0' : '#5a6080',
      },
      grid: {
        vertLines: { color: isDark ? '#1e2235' : '#e8eaf0' },
        horzLines: { color: isDark ? '#1e2235' : '#e8eaf0' },
      },
      crosshair:       { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#1e2235' : '#e8eaf0' },
      timeScale: {
        borderColor: isDark ? '#1e2235' : '#e8eaf0',
        timeVisible: true, secondsVisible: false,
      },
      handleScroll: true,
      handleScale:  true,
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#f43f5e',
      borderUpColor: '#22c55e', borderDownColor: '#f43f5e',
      wickUpColor: '#22c55e', wickDownColor: '#f43f5e',
    })
    candleRef.current = candleSeries  // FIX: assign ref

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#3d8ef8',
      topColor: 'rgba(61,142,248,0.3)',
      bottomColor: 'rgba(61,142,248,0.0)',
      lineWidth: 2, visible: false,
    })
    areaRef.current = areaSeries  // FIX: assign ref

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3d8ef826',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    volumeRef.current = volumeSeries

    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData) { setTooltip(null); return }
      const candle = param.seriesData.get(candleSeries)
      const area   = param.seriesData.get(areaSeries)
      const vol    = param.seriesData.get(volumeSeries)
      if (candle) {
        setTooltip({
          open: candle.open, high: candle.high,
          low: candle.low, close: candle.close,
          volume: vol?.value, isUp: candle.close >= candle.open,
        })
      } else if (area) {
        setTooltip({ close: area.value, volume: vol?.value })
      }
    })

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    setChartReady(true)  // FIX: signal refs are ready

    return () => {
      ro.disconnect()
      chart.remove()
      setChartReady(false)
      chartRef.current = null; candleRef.current = null
      volumeRef.current = null; areaRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartReady) return  // FIX: wait for refs
    loadData()
  }, [chartReady, coinId, days, currency])

  const loadData = async () => {
    setLoading(true)
    const [candles, volumes] = await Promise.all([
      fetchOHLCV(coinId, days, currency),
      fetchVolume(coinId, days, currency),
    ])

    if (candles && candles.length > 0) {
      const seen = new Set()
      const unique = candles
        .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })
        .sort((a, b) => a.time - b.time)

      candleRef.current?.setData(unique)
      areaRef.current?.setData(unique.map(c => ({ time: c.time, value: c.close })))

      if (volumes && volumes.length > 0) {
        const seenV = new Set()
        const uniqueV = volumes
          .filter(v => { if (seenV.has(v.time)) return false; seenV.add(v.time); return true })
          .sort((a, b) => a.time - b.time)
        const coloredVol = uniqueV.map(v => {
          const candle = unique.find(c => Math.abs(c.time - v.time) < 3600)
          const isUp = candle ? candle.close >= candle.open : true
          return { ...v, color: isUp ? 'rgba(34,197,94,0.25)' : 'rgba(244,63,94,0.25)' }
        })
        volumeRef.current?.setData(coloredVol)
      }

      chartRef.current?.timeScale().fitContent()
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!chartReady) return
    candleRef.current?.applyOptions({ visible: chartType === 'candle' })
    areaRef.current?.applyOptions({ visible: chartType === 'area' })
  }, [chartType, chartReady])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!chartRef.current) return
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
      chartRef.current.applyOptions({
        layout: { textColor: isDark ? '#a0a8c0' : '#5a6080' },
        grid: {
          vertLines: { color: isDark ? '#1e2235' : '#e8eaf0' },
          horzLines: { color: isDark ? '#1e2235' : '#e8eaf0' },
        },
        rightPriceScale: { borderColor: isDark ? '#1e2235' : '#e8eaf0' },
        timeScale:       { borderColor: isDark ? '#1e2235' : '#e8eaf0' },
      })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  function fmtPrice(p) {
    if (!p) return '—'
    if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    if (p >= 1) return `$${p.toFixed(4)}`
    return `$${p.toFixed(6)}`
  }

  function fmtVol(v) {
    if (!v) return '—'
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
    return `$${v.toLocaleString()}`
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{
          display: 'flex', gap: 4,
          background: 'var(--bg-base)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 3,
        }}>
          {[
            { key: 'candle', label: '🕯 Candles' },
            { key: 'area',   label: '📈 Line'    },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setChartType(key)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none',
              background: chartType === key ? 'var(--bg-elevated)' : 'transparent',
              color:      chartType === key ? 'var(--text1)' : 'var(--text3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: chartType === key ? 'var(--shadow-sm)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {TIMEFRAMES.map(({ label, days: d }) => (
            <button key={label} onClick={() => setDays(d)} style={{
              padding: '4px 12px', borderRadius: 7,
              border:     `1px solid ${days === d ? 'var(--blue)' : 'var(--border)'}`,
              background: days === d ? 'rgba(61,142,248,0.10)' : 'transparent',
              color:      days === d ? 'var(--blue)' : 'var(--text3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
          {tooltip.open != null && (
            <>
              <TooltipStat label="O" value={fmtPrice(tooltip.open)}  color="var(--text2)" />
              <TooltipStat label="H" value={fmtPrice(tooltip.high)}  color="var(--green)" />
              <TooltipStat label="L" value={fmtPrice(tooltip.low)}   color="var(--red)"   />
            </>
          )}
          <TooltipStat label="C" value={fmtPrice(tooltip.close)}
            color={tooltip.isUp ? 'var(--green)' : 'var(--red)'} />
          {tooltip.volume && (
            <TooltipStat label="Vol" value={fmtVol(tooltip.volume)} color="var(--text3)" />
          )}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-elevated)', borderRadius: 8,
            zIndex: 10, color: 'var(--text3)', fontSize: 13,
          }}>
            Loading chart...
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
      </div>
    </div>
  )
}

function TooltipStat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: 'var(--text4)', fontSize: 11, fontWeight: 600 }}>{label}</span>
      <span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: 'var(--ff-mono)' }}>
        {value}
      </span>
    </div>
  )
}
