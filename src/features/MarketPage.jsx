import { useState, useRef, useEffect }  from 'react'
import { useNavigate }        from 'react-router-dom'
import { Star }               from 'lucide-react'
import { useMarketData }      from '../hooks/useMarketData'
import { useLivePrices }      from '../hooks/useLivePrices'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useWatchlist }       from '../store/watchlistStore'


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

function fmtLarge(n, currency) {
  if (!n) return '—'
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `${sym}${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `${sym}${(n / 1e6).toFixed(2)}M`
  return `${sym}${n.toLocaleString()}`
}

const PER_PAGE = 25

export default function MarketPage() {
  const [page, setPage] = useState(1)
  const { currency }    = useCurrency()

  const { coins, loading, error } = useMarketData({
    page, perPage: PER_PAGE, currency,
  })

  const livePrices = useLivePrices(currency === 'usd' ? coins : [])

  const goToPage = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) return (
    <div style={{ color: 'var(--red)', padding: '2rem' }}>Error: {error}</div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      <h1 style={{
        color:        'var(--text1)',
        fontSize:     22,
        fontWeight:   700,
        fontFamily:   'var(--ff-display)',
        marginBottom: 20,
      }}>
        Market Overview
      </h1>

      {/* Column headers */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '28px 32px 1fr 120px 100px 90px 32px',
        gap:                 14,
        padding:             '0 18px 8px',
        alignItems:          'center',
      }}>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>#</span>
        <span />
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>Name</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Price</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Market Cap</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>24h %</span>
        <span />
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading
          ? Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonRow key={i} />)
          : coins.map((coin) => (
              <CoinRow
                key={coin.id}
                coin={coin}
                currency={currency}
                livePrice={livePrices[coin.id]}
              />
            ))
        }
      </div>

      {/* Pagination */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            8,
        marginTop:      24,
      }}>
        <PaginationBtn onClick={() => goToPage(page - 1)} disabled={page === 1}>
          ← Prev
        </PaginationBtn>
        {getPageNumbers(page).map((p) => (
          <PaginationBtn key={p} onClick={() => goToPage(p)} active={p === page}>
            {p}
          </PaginationBtn>
        ))}
        <PaginationBtn onClick={() => goToPage(page + 1)} disabled={page >= 20}>
          Next →
        </PaginationBtn>
      </div>

      <div style={{
        textAlign:  'center',
        marginTop:  10,
        color:      'var(--text3)',
        fontSize:   12,
        fontFamily: 'var(--ff-mono)',
      }}>
        Page {page} of 20 · {(page - 1) * PER_PAGE + 1}–{page * PER_PAGE} of 500 coins
      </div>

    </div>
  )
}

// ── Page number logic ──
function getPageNumbers(current) {
  const total = 20, delta = 2
  let start = Math.max(1, current - delta)
  let end   = Math.min(total, current + delta)
  if (current <= delta)         end   = Math.min(total, delta * 2 + 1)
  if (current >= total - delta) start = Math.max(1, total - delta * 2)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

// ── Pagination button ──
function PaginationBtn({ onClick, disabled, active, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:      '6px 12px',
        borderRadius: 8,
        border:       `1px solid ${active ? 'var(--blue)' : 'var(--border-md)'}`,
        background:   active
          ? 'rgba(61,142,248,0.15)'
          : hovered && !disabled ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        color:      active ? 'var(--blue)' : disabled ? 'var(--text4)' : hovered ? 'var(--text1)' : 'var(--text2)',
        fontSize:   13,
        fontWeight: 600,
        fontFamily: 'var(--ff-mono)',
        cursor:     disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        opacity:    disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ── Skeleton row ──
function SkeletonRow() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '28px 32px 1fr 120px 100px 90px 32px',
      gap:                 14,
      padding:             '12px 18px',
      alignItems:          'center',
      background:          'var(--bg-elevated)',
      border:              '1px solid var(--border)',
      borderRadius:        12,
    }}>
      <Shimmer width={20}  height={12} />
      <Shimmer width={32}  height={32} radius="50%" />
      <div>
        <Shimmer width={120} height={13} />
        <Shimmer width={50}  height={10} style={{ marginTop: 5 }} />
      </div>
      <Shimmer width={80} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={70} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={55} height={24} style={{ marginLeft: 'auto', borderRadius: 6 }} />
      <Shimmer width={28} height={28} radius={6} />
    </div>
  )
}

// ── Shimmer block ──
function Shimmer({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius:   radius,
      flexShrink:     0,
      background:     'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

// ── Coin row ──
function CoinRow({ coin, currency, livePrice }) {
  const [hovered,  setHovered]  = useState(false)
  const [flash,    setFlash]    = useState(null)
  const prevPriceRef            = useRef(null)
  const navigate                = useNavigate()

  const displayPrice = livePrice ?? coin.current_price
  const change       = coin.price_change_percentage_24h
  const isUp         = change >= 0

  // Flash green/red when live price changes
  useEffect(() => {
    if (livePrice !== undefined && prevPriceRef.current !== null) {
      if (livePrice > prevPriceRef.current && flash !== 'up') {
        setTimeout(() => {
          setFlash('up')
          setTimeout(() => setFlash(null), 600)
        }, 0)
      } else if (livePrice < prevPriceRef.current && flash !== 'down') {
        setTimeout(() => {
          setFlash('down')
          setTimeout(() => setFlash(null), 600)
        }, 0)
      }
    }
    if (livePrice !== undefined) prevPriceRef.current = livePrice
  }, [livePrice, flash])

  return (
    <div
      onClick={() => navigate(`/coin/${coin.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '28px 32px 1fr 120px 100px 90px 32px',
        gap:                 14,
        padding:             '12px 18px',
        alignItems:          'center',
        background:   flash === 'up'   ? 'rgba(34,197,94,0.08)'
                    : flash === 'down' ? 'rgba(244,63,94,0.08)'
                    : hovered          ? 'var(--bg-hover)'
                    : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'pointer',
        transition:   flash ? 'background 0.1s' : 'all 0.15s',
      }}
    >
      {/* Rank */}
      <span style={{
        color:      'var(--text4)',
        fontSize:   12,
        fontFamily: 'var(--ff-mono)',
      }}>
        {coin.market_cap_rank}
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
        color:      flash === 'up'   ? 'var(--green)'
                  : flash === 'down' ? 'var(--red)'
                  : 'var(--text1)',
        fontFamily: 'var(--ff-mono)',
        fontWeight: 600,
        fontSize:   14,
        textAlign:  'right',
        transition: 'color 0.3s',
      }}>
        {fmtPrice(displayPrice, currency)}
      </div>

      {/* Market cap */}
      <div style={{
        color:      'var(--text2)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   13,
        textAlign:  'right',
      }}>
        {fmtLarge(coin.market_cap, currency)}
      </div>

      {/* 24h change */}
      <div style={{
        color:        isUp ? 'var(--green)' : 'var(--red)',
        fontFamily:   'var(--ff-mono)',
        fontWeight:   600,
        fontSize:     13,
        textAlign:    'right',
        padding:      '3px 8px',
        borderRadius: 6,
        background:   isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
      }}>
        {isUp ? '+' : ''}{change?.toFixed(2)}%
      </div>

      {/* Star */}
      <WatchStar coinId={coin.id} />

    </div>
  )
}

// ── Watchlist star button ──
function WatchStar({ coinId }) {
  const { toggle, has } = useWatchlist()
  const [hovered, setHovered] = useState(false)
  const isWatched = has(coinId)

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(coinId) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          28,
        height:         28,
        borderRadius:   6,
        border:         'none',
        background:     hovered ? 'var(--bg-base)' : 'transparent',
        cursor:         'pointer',
        transition:     'all 0.15s',
        flexShrink:     0,
      }}
    >
      <Star
        size={14}
        fill={isWatched ? 'var(--gold)' : 'none'}
        color={isWatched ? 'var(--gold)' : 'var(--text4)'}
        strokeWidth={2}
      />
    </button>
  )
}