import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import { Star }                 from 'lucide-react'
import { fetchMarkets }         from '../utils/marketAPI'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useWatchlist }         from '../store/watchlistStore'

function fmtPrice(price, currency) {
  if (price == null) return '—'
  if (currency === 'btc') return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${price.toFixed(price < 0.01  ? 6 : 4)}`
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

// Which tab is active — gainers or losers
const TABS = [
  { key: 'gainers', label: 'Top Gainers', icon: TrendingUp  },
  { key: 'losers',  label: 'Top Losers',  icon: TrendingDown },
]

export default function GainersPage() {
  const [coins,     setCoins]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('gainers')
  const { currency }              = useCurrency()

  // Fetch top 250 coins so we have enough to sort gainers/losers from
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      // Fetch 2 pages of 100 coins each to get top 200
      const [page1, page2] = await Promise.all([
        fetchMarkets({ page: 1, perPage: 100, currency }),
        fetchMarkets({ page: 2, perPage: 100, currency }),
      ])

      if (page1.error) { setError(page1.error); setLoading(false); return }

      const all = [
        ...(page1.data || []),
        ...(page2.data || []),
      ]

      setCoins(all)
      setLoading(false)
    }

    load()
  }, [currency])

  // Sort by 24h change
  const sorted = [...coins].sort((a, b) => {
    const aChange = a.price_change_percentage_24h ?? 0
    const bChange = b.price_change_percentage_24h ?? 0
    return activeTab === 'gainers'
      ? bChange - aChange   // highest first
      : aChange - bChange   // lowest first
  })

  // Show top 25
  const displayed = sorted.slice(0, 25)

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   10,
          background:     'rgba(61,142,248,0.12)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <ArrowUpDown size={18} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{
            color:      'var(--text1)',
            fontSize:   22,
            fontWeight: 700,
            fontFamily: 'var(--ff-display)',
          }}>
            Movers
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Top gainers and losers in the last 24h
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{
        display:      'flex',
        gap:          4,
        background:   'var(--bg-elevated)',
        border:       '1px solid var(--border)',
        borderRadius: 10,
        padding:      4,
        marginBottom: 20,
        width:        'fit-content',
      }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key
          return (
            <TabBtn
              key={key}
              label={label}
              icon={<Icon size={14} />}
              active={isActive}
              color={key === 'gainers' ? 'var(--green)' : 'var(--red)'}
              onClick={() => setActiveTab(key)}
            />
          )
        })}
      </div>

      {/* Column headers */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '24px 32px 1fr 120px 90px 32px',
        gap:                 14,
        padding:             '0 18px 8px',
        alignItems:          'center',
      }}>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>#</span>
        <span />
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>Name</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Price</span>
        <span style={{
          color:     activeTab === 'gainers' ? 'var(--green)' : 'var(--red)',
          fontSize:  11,
          fontWeight: 600,
          textAlign: 'right',
        }}>
          24h %
        </span>
        <span />
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading
          ? Array.from({ length: 25 }).map((_, i) => <SkeletonRow key={i} />)
          : displayed.map((coin, index) => (
              <MoverRow
                key={coin.id}
                coin={coin}
                rank={index + 1}
                currency={currency}
                isGainer={activeTab === 'gainers'}
              />
            ))
        }
      </div>

    </div>
  )
}

// ── Tab button ──
function TabBtn({ label, icon, active, color, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         6,
        padding:     '7px 16px',
        borderRadius: 8,
        border:      'none',
        background:  active
          ? 'var(--bg-hover)'
          : hovered ? 'var(--bg-base)' : 'transparent',
        color:       active ? color : 'var(--text3)',
        fontSize:    13,
        fontWeight:  600,
        cursor:      'pointer',
        transition:  'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Mover row ──
function MoverRow({ coin, rank, currency, isGainer }) {
  const [hovered, setHovered] = useState(false)
  const navigate              = useNavigate()
  const { toggle, has }       = useWatchlist()
  const isWatched             = has(coin.id)

  const change = coin.price_change_percentage_24h
  const isUp   = change >= 0

  return (
    <div
      onClick={() => navigate(`/coin/${coin.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '24px 32px 1fr 120px 90px 32px',
        gap:                 14,
        padding:             '11px 18px',
        alignItems:          'center',
        background:   hovered ? 'var(--bg-hover)'  : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {/* Rank */}
      <span style={{
        color:      'var(--text4)',
        fontSize:   11,
        fontFamily: 'var(--ff-mono)',
      }}>
        {rank}
      </span>

      {/* Logo */}
      <img
        src={coin.image}
        alt={coin.name}
        style={{ width: 32, height: 32, borderRadius: '50%' }}
      />

      {/* Name + symbol */}
      <div>
        <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
          {coin.name}
        </div>
        <div style={{
          color:         'var(--text3)',
          fontSize:      11,
          fontFamily:    'var(--ff-mono)',
          textTransform: 'uppercase',
          marginTop:     2,
        }}>
          {coin.symbol}
        </div>
      </div>

      {/* Price */}
      <div style={{
        color:      'var(--text1)',
        fontFamily: 'var(--ff-mono)',
        fontWeight: 600,
        fontSize:   14,
        textAlign:  'right',
      }}>
        {fmtPrice(coin.current_price, currency)}
      </div>

      {/* 24h change — bigger and bolder here since it's the main metric */}
      <div style={{
        color:        isUp ? 'var(--green)' : 'var(--red)',
        fontFamily:   'var(--ff-mono)',
        fontWeight:   700,
        fontSize:     14,
        textAlign:    'right',
        padding:      '4px 10px',
        borderRadius: 8,
        background:   isUp ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)',
      }}>
        {isUp ? '+' : ''}{change?.toFixed(2)}%
      </div>

      {/* Star */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(coin.id) }}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          28,
          height:         28,
          borderRadius:   6,
          border:         'none',
          background:     'transparent',
          cursor:         'pointer',
          flexShrink:     0,
        }}
      >
        <Star
          size={13}
          fill={isWatched ? 'var(--gold)' : 'none'}
          color={isWatched ? 'var(--gold)' : 'var(--text4)'}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

// ── Skeleton ──
function SkeletonRow() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '24px 32px 1fr 120px 90px 32px',
      gap:                 14,
      padding:             '11px 18px',
      alignItems:          'center',
      background:          'var(--bg-elevated)',
      border:              '1px solid var(--border)',
      borderRadius:        12,
    }}>
      <Shimmer width={16}  height={12} />
      <Shimmer width={32}  height={32} radius="50%" />
      <div>
        <Shimmer width={120} height={13} />
        <Shimmer width={50}  height={10} style={{ marginTop: 5 }} />
      </div>
      <Shimmer width={80} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={65} height={26} style={{ marginLeft: 'auto', borderRadius: 8 }} />
      <Shimmer width={28} height={28} radius={6} />
    </div>
  )
}

function Shimmer({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius, flexShrink: 0,
      background:     'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}