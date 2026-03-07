import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { LayoutGrid }          from 'lucide-react'
import { fetchMarkets }        from '../utils/marketAPI'
import { useCurrency }         from '../context/CurrencyContext'
import { usePageTitle }        from '../hooks/usePageTitle'

function getColor(change) {
  if (change == null) return 'rgba(90,96,128,0.4)'
  if (change >=  10) return 'rgba(34,197,94,0.85)'
  if (change >=   5) return 'rgba(34,197,94,0.65)'
  if (change >=   2) return 'rgba(34,197,94,0.45)'
  if (change >=   0) return 'rgba(34,197,94,0.25)'
  if (change >=  -2) return 'rgba(244,63,94,0.25)'
  if (change >=  -5) return 'rgba(244,63,94,0.45)'
  if (change >= -10) return 'rgba(244,63,94,0.65)'
  return 'rgba(244,63,94,0.85)'
}

function getBorder(change) {
  if (change == null) return '1px solid rgba(90,96,128,0.3)'
  if (change >= 0)    return '1px solid rgba(34,197,94,0.35)'
  return                     '1px solid rgba(244,63,94,0.35)'
}

// Tile size based on market cap rank
function getTileSize(rank) {
  if (rank <= 5)  return { minWidth: 160, minHeight: 100 }
  if (rank <= 15) return { minWidth: 120, minHeight: 80  }
  if (rank <= 30) return { minWidth: 100, minHeight: 70  }
  if (rank <= 50) return { minWidth: 85,  minHeight: 60  }
  return                 { minWidth: 70,  minHeight: 55  }
}

const TIMEFRAMES = [
  { key: 'price_change_percentage_1h_in_currency',  label: '1H'  },
  { key: 'price_change_percentage_24h',             label: '24H' },
  { key: 'price_change_percentage_7d_in_currency',  label: '7D'  },
]

export default function HeatmapPage() {
  usePageTitle('Heatmap')
  const { currency } = useCurrency()
  const navigate     = useNavigate()

  const [coins,     setCoins]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [timeframe, setTimeframe] = useState('price_change_percentage_24h')
  const [tooltip,   setTooltip]   = useState(null) // { coin, x, y }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [p1, p2] = await Promise.all([
        fetchMarkets({ page: 1, perPage: 100, currency }),
        fetchMarkets({ page: 2, perPage: 100, currency }),
      ])
      setCoins([...(p1.data || []), ...(p2.data || [])])
      setLoading(false)
    }
    load()
  }, [currency])

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(61,142,248,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LayoutGrid size={18} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Heatmap
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Top 200 coins by market cap — tile size = market cap weight
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10, padding: 4,
        }}>
          {TIMEFRAMES.map(({ key, label }) => {
            const active = timeframe === key
            return (
              <button
                key={key}
                onClick={() => setTimeframe(key)}
                style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: active ? 'var(--bg-hover)' : 'transparent',
                  color: active ? 'var(--text1)' : 'var(--text3)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
          Change:
        </span>
        {[
          { label: '≥+10%',  color: 'rgba(34,197,94,0.85)'  },
          { label: '+5-10%', color: 'rgba(34,197,94,0.65)'  },
          { label: '+2-5%',  color: 'rgba(34,197,94,0.45)'  },
          { label: '0-2%',   color: 'rgba(34,197,94,0.25)'  },
          { label: '0-2%',   color: 'rgba(244,63,94,0.25)'  },
          { label: '-2-5%',  color: 'rgba(244,63,94,0.45)'  },
          { label: '-5-10%', color: 'rgba(244,63,94,0.65)'  },
          { label: '≤-10%',  color: 'rgba(244,63,94,0.85)'  },
        ].map(({ label, color }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: color,
            }} />
            <span style={{ color: 'var(--text3)', fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      {loading ? (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 14,
          padding: 16,
        }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{
              minWidth: i < 5 ? 160 : i < 15 ? 120 : i < 30 ? 100 : 70,
              minHeight: i < 5 ? 100 : i < 15 ? 80 : i < 30 ? 70 : 55,
              borderRadius: 8,
              background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              flex: 1,
            }} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 14,
            padding: 16,
            position: 'relative',
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {coins.map((coin) => {
            const change = coin[timeframe]
            const { minWidth, minHeight } = getTileSize(coin.market_cap_rank)
            const isUp = change >= 0

            return (
              <div
                key={coin.id}
                onClick={() => navigate(`/coin/${coin.id}`)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltip({ coin, change, x: rect.left, y: rect.bottom + 8 })
                }}
                style={{
                  minWidth,
                  minHeight,
                  flex:         1,
                  borderRadius: 8,
                  background:   getColor(change),
                  border:       getBorder(change),
                  display:      'flex',
                  flexDirection: 'column',
                  alignItems:   'center',
                  justifyContent: 'center',
                  cursor:       'pointer',
                  transition:   'transform 0.1s, filter 0.1s',
                  padding:      4,
                  overflow:     'hidden',
                }}
                onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                onMouseOut={e  => e.currentTarget.style.filter = 'brightness(1)'}
              >
                {/* Logo — only show if tile is big enough */}
                {minHeight >= 70 && (
                  <img
                    src={coin.image}
                    alt={coin.name}
                    style={{
                      width: minHeight >= 80 ? 28 : 20,
                      height: minHeight >= 80 ? 28 : 20,
                      borderRadius: '50%',
                      marginBottom: 4,
                    }}
                  />
                )}

                {/* Symbol */}
                <div style={{
                  color: '#fff',
                  fontSize: minWidth >= 120 ? 13 : 10,
                  fontWeight: 700,
                  fontFamily: 'var(--ff-mono)',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}>
                  {coin.symbol?.toUpperCase()}
                </div>

                {/* Change % */}
                <div style={{
                  color: '#fff',
                  fontSize: minWidth >= 120 ? 12 : 9,
                  fontWeight: 600,
                  fontFamily: 'var(--ff-mono)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  marginTop: 2,
                }}>
                  {change != null ? `${isUp ? '+' : ''}${change.toFixed(2)}%` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x, window.innerWidth - 220),
          top:  tooltip.y,
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border-md)',
          borderRadius: 10,
          padding:      '10px 14px',
          zIndex:       999,
          boxShadow:    'var(--shadow-lg)',
          pointerEvents: 'none',
          minWidth:     190,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <img src={tooltip.coin.image} alt={tooltip.coin.name}
              style={{ width: 22, height: 22, borderRadius: '50%' }} />
            <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 13 }}>
              {tooltip.coin.name}
            </span>
            <span style={{ color: 'var(--text3)', fontSize: 11,
              fontFamily: 'var(--ff-mono)', textTransform: 'uppercase' }}>
              {tooltip.coin.symbol}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TooltipRow label="Price"
              value={`$${tooltip.coin.current_price?.toLocaleString()}`} />
            <TooltipRow
              label="Change"
              value={tooltip.change != null
                ? `${tooltip.change >= 0 ? '+' : ''}${tooltip.change.toFixed(2)}%`
                : '—'}
              color={tooltip.change >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <TooltipRow label="Rank" value={`#${tooltip.coin.market_cap_rank}`} />
          </div>
        </div>
      )}

    </div>
  )
}

function TooltipRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: 'var(--text3)', fontSize: 12 }}>{label}</span>
      <span style={{
        color: color || 'var(--text1)', fontSize: 12,
        fontWeight: 600, fontFamily: 'var(--ff-mono)',
      }}>
        {value}
      </span>
    </div>
  )
}