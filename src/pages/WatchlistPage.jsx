import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { Star }                from 'lucide-react'
import { useWatchlist }        from '../store/watchlistStore'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { fetchPortfolioCoins } from '../utils/marketAPI'

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

export default function WatchlistPage() {
  const { ids, toggle }  = useWatchlist()
  const { currency }     = useCurrency()
  const navigate         = useNavigate()

  const [coins,   setCoins]   = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch prices for watchlisted coins whenever ids or currency changes
  useEffect(() => {
    if (!ids.length) return

    const load = async () => {
      setLoading(true)
      const { data } = await fetchPortfolioCoins(ids, currency)
      setCoins(data || [])
      setLoading(false)
    }

    load()
  }, [ids, currency])

  // Empty state
  if (!ids.length) return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>
      <h1 style={{
        color:        'var(--text1)',
        fontSize:     22,
        fontWeight:   700,
        fontFamily:   'var(--ff-display)',
        marginBottom: 8,
      }}>
        Watchlist
      </h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>
        Your saved coins will appear here.
      </p>

      {/* Empty state card */}
      <div style={{
        background:     'var(--bg-elevated)',
        border:         '1px solid var(--border)',
        borderRadius:   16,
        padding:        48,
        textAlign:      'center',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            12,
      }}>
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   '50%',
          background:     'var(--bg-hover)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Star size={22} color="var(--text4)" />
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 15, fontWeight: 600 }}>
          No coins yet
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          Click the ★ on any coin in Markets to add it here
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop:    8,
            padding:      '8px 20px',
            borderRadius: 8,
            border:       'none',
            background:   'var(--blue)',
            color:        '#fff',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          Browse Markets
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   20,
      }}>
        <div>
          <h1 style={{
            color:      'var(--text1)',
            fontSize:   22,
            fontWeight: 700,
            fontFamily: 'var(--ff-display)',
          }}>
            Watchlist
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
            {ids.length} coin{ids.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '32px 1fr 120px 90px 32px',
        gap:                 14,
        padding:             '0 18px 8px',
        alignItems:          'center',
      }}>
        <span />
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>Name</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Price</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>24h %</span>
        <span />
      </div>

      {/* Coin rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading
          ? Array.from({ length: ids.length }).map((_, i) => (
              <WatchSkeletonRow key={i} />
            ))
          : coins.map((coin) => (
              <WatchCoinRow
                key={coin.id}
                coin={coin}
                currency={currency}
                onRemove={() => toggle(coin.id)}
                onClick={() => navigate(`/coin/${coin.id}`)}
              />
            ))
        }
      </div>
    </div>
  )
}

function WatchCoinRow({ coin, currency, onRemove, onClick }) {
  const [hovered, setHovered] = useState(false)
  const change = coin.price_change_percentage_24h
  const isUp   = change >= 0

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '32px 1fr 120px 90px 32px',
        gap:                 14,
        padding:             '12px 18px',
        alignItems:          'center',
        background:   hovered ? 'var(--bg-hover)'  : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
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
          color: 'var(--text3)', fontSize: 11, marginTop: 2,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase',
        }}>
          {coin.symbol}
        </div>
      </div>

      {/* Price */}
      <div style={{
        color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
        fontWeight: 600, fontSize: 14, textAlign: 'right',
      }}>
        {fmtPrice(coin.current_price, currency)}
      </div>

      {/* 24h change */}
      <div style={{
        color:        isUp ? 'var(--green)' : 'var(--red)',
        fontFamily:   'var(--ff-mono)', fontWeight: 600,
        fontSize:     13, textAlign: 'right',
        padding:      '3px 8px', borderRadius: 6,
        background:   isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
      }}>
        {isUp ? '+' : ''}{change?.toFixed(2)}%
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
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
          color:          'var(--gold)',
        }}
      >
        <Star size={14} fill="var(--gold)" strokeWidth={2} />
      </button>
    </div>
  )
}

function WatchSkeletonRow() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '32px 1fr 120px 90px 32px',
      gap:                 14,
      padding:             '12px 18px',
      alignItems:          'center',
      background:          'var(--bg-elevated)',
      border:              '1px solid var(--border)',
      borderRadius:        12,
    }}>
      <Shimmer width={32} height={32} radius="50%" />
      <div>
        <Shimmer width={120} height={13} />
        <Shimmer width={50}  height={10} style={{ marginTop: 5 }} />
      </div>
      <Shimmer width={80} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={55} height={24} style={{ marginLeft: 'auto', borderRadius: 6 }} />
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