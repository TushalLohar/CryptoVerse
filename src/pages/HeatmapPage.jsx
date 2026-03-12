import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { LayoutGrid }          from 'lucide-react'
import { fetchMarkets }        from '../utils/marketAPI'
import { useCurrency }         from '../context/CurrencyContext'
import { usePageTitle }        from '../hooks/usePageTitle'

// --- Color Helpers (logic remains exactly as provided) ---
const getColor = (change) => {
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

const getBorder = (change) => {
  if (change == null) return '1px solid rgba(90,96,128,0.3)'
  return change >= 0 ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(244,63,94,0.35)'
}

const getTileSize = (rank) => {
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
  const [tooltip,   setTooltip]   = useState(null)

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
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(61,142,248,0.12)] flex items-center justify-center">
            <LayoutGrid size={18} className="text-[var(--blue)]" />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">Heatmap</h1>
            <p className="text-[var(--text3)] text-[13px] mt-0.5">Top 200 coins by market cap — tile size = market cap weight</p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[10px] p-1">
          {TIMEFRAMES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={`px-3.5 py-1.5 rounded-lg border-none text-xs font-bold cursor-pointer transition-all duration-150
                ${timeframe === key ? 'bg-[var(--bg-hover)] text-[var(--text1)]' : 'bg-transparent text-[var(--text3)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[var(--text3)] text-[11px] font-semibold">Change:</span>
        {[
          { label: '≥+10%',  color: 'bg-[rgba(34,197,94,0.85)]' },
          { label: '+5-10%', color: 'bg-[rgba(34,197,94,0.65)]' },
          { label: '+2-5%',  color: 'bg-[rgba(34,197,94,0.45)]' },
          { label: '0-2%',   color: 'bg-[rgba(34,197,94,0.25)]' },
          { label: '0-2%',   color: 'bg-[rgba(244,63,94,0.25)]' },
          { label: '-2-5%',  color: 'bg-[rgba(244,63,94,0.45)]' },
          { label: '-5-10%', color: 'bg-[rgba(244,63,94,0.65)]' },
          { label: '≤-10%',  color: 'bg-[rgba(244,63,94,0.85)]' },
        ].map(({ label, color }, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-3.5 h-3.5 rounded-sm ${color}`} />
            <span className="text-[var(--text3)] text-[10px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div 
        className="flex flex-wrap gap-1 content-start bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 relative"
        onMouseLeave={() => setTooltip(null)}
      >
        {loading ? (
          Array.from({ length: 60 }).map((_, i) => {
            const { minWidth, minHeight } = getTileSize(i + 1)
            return (
              <div 
                key={i} 
                className="rounded-lg bg-gradient-to-r from-[var(--bg-hover)] via-[var(--bg-elevated)] to-[var(--bg-hover)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite] flex-1"
                style={{ minWidth, minHeight }}
              />
            )
          })
        ) : (
          coins.map((coin) => {
            const change = coin[timeframe]
            const { minWidth, minHeight } = getTileSize(coin.market_cap_rank)
            const isUp = (change ?? 0) >= 0

            return (
              <div
                key={coin.id}
                onClick={() => navigate(`/coin/${coin.id}`)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltip({ coin, change, x: rect.left, y: rect.bottom + 8 })
                }}
                className="flex flex-col items-center justify-center p-1 cursor-pointer overflow-hidden rounded-lg transition-all duration-100 hover:brightness-[1.2] flex-1"
                style={{
                  minWidth,
                  minHeight,
                  background: getColor(change),
                  border: getBorder(change)
                }}
              >
                {/* Logo */}
                {minHeight >= 70 && (
                  <img
                    src={coin.image}
                    alt={coin.name}
                    className={`rounded-full mb-1 ${minHeight >= 80 ? 'w-7 h-7' : 'w-5 h-5'}`}
                  />
                )}

                {/* Symbol */}
                <div className={`text-white font-bold font-[var(--ff-mono)] uppercase drop-shadow-md ${minWidth >= 120 ? 'text-[13px]' : 'text-[10px]'}`}>
                  {coin.symbol}
                </div>

                {/* Change % */}
                <div className={`text-white font-semibold font-[var(--ff-mono)] drop-shadow-md mt-0.5 ${minWidth >= 120 ? 'text-[12px]' : 'text-[9px]'}`}>
                  {change != null ? `${isUp ? '+' : ''}${change.toFixed(2)}%` : '—'}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="fixed bg-[var(--bg-elevated)] border border-[var(--border-md)] rounded-xl p-[10px_14px] z-[999] shadow-[var(--shadow-lg)] pointer-events-none min-w-[190px]"
          style={{ 
            left: Math.min(tooltip.x, window.innerWidth - 220), 
            top: tooltip.y 
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <img src={tooltip.coin.image} alt={tooltip.coin.name} className="w-[22px] h-[22px] rounded-full" />
            <span className="text-[var(--text1)] font-bold text-[13px]">{tooltip.coin.name}</span>
            <span className="text-[var(--text3)] text-[11px] font-[var(--ff-mono)] uppercase">{tooltip.coin.symbol}</span>
          </div>
          <div className="flex flex-col gap-1">
            <TooltipRow label="Price" value={`$${tooltip.coin.current_price?.toLocaleString()}`} />
            <TooltipRow
              label="Change"
              value={tooltip.change != null ? `${tooltip.change >= 0 ? '+' : ''}${tooltip.change.toFixed(2)}%` : '—'}
              color={tooltip.change >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}
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
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text3)] text-xs">{label}</span>
      <span className={`text-xs font-bold font-[var(--ff-mono)] ${color || 'text-[var(--text1)]'}`}>
        {value}
      </span>
    </div>
  )
}