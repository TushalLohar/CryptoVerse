import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { useChart }    from '../../hooks/useChart'
import { useCurrency, CURRENCIES } from '../../context/CurrencyContext'
import { C }           from '../../utils/theme'

// Timeframe options
const TIMEFRAMES = [
  { label: '1D',  days: 1   },
  { label: '7D',  days: 7   },
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '1Y',  days: 365 },
]

// Format timestamp for X axis label
// Shows different format depending on timeframe
function fmtTime(timestamp, days) {
  const date = new Date(timestamp)
  if (days <= 1) {
    // 1 day → show hour:minute
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (days <= 30) {
    // up to 1 month → show month/day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  // longer → show month year
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Format price for tooltip
function fmtPrice(price, currency) {
  if (price == null) return '—'
  if (currency === 'btc') return `₿${price.toFixed(6)}`
  if (currency === 'eth') return `Ξ${price.toFixed(4)}`
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

export default function CoinChart({ coinId }) {
  const [days, setDays]    = useState(7)
  const { currency }       = useCurrency()

  const { chartData, loading, error } = useChart(coinId, currency, days)

  // Is the overall price trend up or down?
  // This determines the chart color (green = up, red = down)
  const isUp = useMemo(() => {
    if (chartData.length < 2) return true
    return chartData[chartData.length - 1].price >= chartData[0].price
  }, [chartData])

  const lineColor = isUp ? 'var(--green)' : 'var(--red)'

  // Only show every Nth label on X axis to avoid crowding
  const xTickCount = 6

  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       `1px solid var(--border)`,
      borderRadius: 14,
      padding:      20,
    }}>

      {/* Chart header — timeframe buttons */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   20,
      }}>
        <span style={{
          color:      'var(--text1)',
          fontSize:   14,
          fontWeight: 700,
        }}>
          Price Chart
        </span>

        {/* Timeframe selector */}
        <div style={{
          display:      'flex',
          gap:          4,
          background:   'var(--bg-base)',
          border:       `1px solid var(--border)`,
          borderRadius: 8,
          padding:      3,
        }}>
          {TIMEFRAMES.map(({ label, days: d }) => (
            <TimeframeBtn
              key={d}
              label={label}
              active={days === d}
              onClick={() => setDays(d)}
            />
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{ position: 'relative', height: 280 }}>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(13,15,26,0.5)',
            borderRadius:   8,
            zIndex:         10,
          }}>
            <div style={{
              width:        20,
              height:       20,
              border:       `2px solid var(--border-md)`,
              borderTop:    `2px solid var(--blue)`,
              borderRadius: '50%',
              animation:    'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {error && (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            height:         '100%',
            color:          'var(--text3)',
            fontSize:       13,
          }}>
            Failed to load chart
          </div>
        )}

        {!error && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              {/* Gradient fill under the line */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={lineColor}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={lineColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="time"
                // Only show a few ticks to avoid crowding
                tickFormatter={(t) => fmtTime(t, days)}
                interval={Math.floor(chartData.length / xTickCount)}
                tick={{ fill: 'var(--text3)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />

              <YAxis
                // Auto domain with 1% padding
                domain={['auto', 'auto']}
                tickFormatter={(v) => fmtPrice(v, currency)}
                tick={{ fill: 'var(--text3)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />

              {/* Custom tooltip */}
              <Tooltip content={<CustomTooltip currency={currency} days={days} />} />

              <Area
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#chartGradient)"
                // Disable animation so chart updates instantly on timeframe change
                isAnimationActive={false}
                dot={false}         // no dots on each data point
                activeDot={{
                  r:           4,
                  fill:        lineColor,
                  strokeWidth: 0,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  )
}

// ── Custom tooltip shown on hover ──
function CustomTooltip({ active, payload, currency, days }) {
  if (!active || !payload?.length) return null

  const { time, price } = payload[0].payload

  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       `1px solid var(--border-md)`,
      borderRadius: 8,
      padding:      '8px 12px',
      boxShadow:    'var(--shadow-lg)',
    }}>
      <div style={{
        color:      'var(--text3)',
        fontSize:   11,
        marginBottom: 4,
      }}>
        {fmtTime(time, days)}
      </div>
      <div style={{
        color:      'var(--text1)',
        fontSize:   14,
        fontWeight: 700,
        fontFamily: 'var(--ff-mono)',
      }}>
        {fmtPrice(price, currency)}
      </div>
    </div>
  )
}

// ── Timeframe button ──
function TimeframeBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:      '4px 10px',
        borderRadius: 6,
        border:       'none',
        background:   active
          ? 'var(--bg-elevated)'
          : hovered ? 'var(--bg-hover)' : 'transparent',
        color:      active ? 'var(--text1)' : 'var(--text3)',
        fontSize:   12,
        fontWeight: 600,
        cursor:     'pointer',
        transition: 'all 0.15s',
        fontFamily: 'var(--ff-mono)',
      }}
    >
      {label}
    </button>
  )
}