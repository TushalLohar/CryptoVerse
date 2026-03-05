import { useState } from 'react'
import { useMarketData } from '../hooks/useMarketData'
import { useCurrency }   from '../context/CurrencyContext'  // ← add this
import { C } from '../utils/theme'

function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

const PER_PAGE = 25

export default function MarketPage() {
  const [page, setPage]       = useState(1)
  const { currency }          = useCurrency()  // ← add this

  const { coins, loading, error } = useMarketData({
    page,
    perPage:  PER_PAGE,
    currency,           // ← was hardcoded 'usd', now from context
  })

  // ... rest of the file stays exactly the same

  // Scroll to top when page changes
  // so user sees the first coin of the new page, not where they scrolled to
  const goToPage = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) return (
    <div style={{ color: C.red, padding: '2rem' }}>Error: {error}</div>
  )

  return (
    <div>
      <h1 style={{
        color:        C.text1,
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
        gridTemplateColumns: '28px 32px 1fr 120px 100px 90px',
        gap:                 14,
        padding:             '0 18px 8px',
        alignItems:          'center',
      }}>
        <span style={{ color: C.text3, fontSize: 11, fontWeight: 600 }}>#</span>
        <span />
        <span style={{ color: C.text3, fontSize: 11, fontWeight: 600 }}>Name</span>
        <span style={{ color: C.text3, fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Price</span>
        <span style={{ color: C.text3, fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Market Cap</span>
        <span style={{ color: C.text3, fontSize: 11, fontWeight: 600, textAlign: 'right' }}>24h %</span>
      </div>

      {/* Coin rows — show skeletons while loading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading
          ? Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonRow key={i} />)
          : coins.map((coin) => <CoinRow key={coin.id} coin={coin} />)
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
        {/* Prev button */}
        <PaginationBtn
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
        >
          ← Prev
        </PaginationBtn>

        {/* Page number buttons */}
        {getPageNumbers(page).map((p) => (
          <PaginationBtn
            key={p}
            onClick={() => goToPage(p)}
            active={p === page}
          >
            {p}
          </PaginationBtn>
        ))}

        {/* Next button */}
        <PaginationBtn
          onClick={() => goToPage(page + 1)}
          disabled={page >= 20}  // CoinGecko free tier goes up to ~500 coins = 20 pages
        >
          Next →
        </PaginationBtn>
      </div>

      {/* Current page indicator */}
      <div style={{
        textAlign:  'center',
        marginTop:  10,
        color:      C.text3,
        fontSize:   12,
        fontFamily: 'var(--ff-mono)',
      }}>
        Page {page} of 20 · {(page - 1) * PER_PAGE + 1}–{page * PER_PAGE} of 500 coins
      </div>

    </div>
  )
}

// ── Returns which page numbers to show around current page ──
// Example: page=5 → [3, 4, 5, 6, 7]
// Example: page=1 → [1, 2, 3, 4, 5]
function getPageNumbers(current) {
  const total  = 20
  const delta  = 2  // how many pages to show on each side

  let start = Math.max(1, current - delta)
  let end   = Math.min(total, current + delta)

  // If near the start, shift end forward
  if (current <= delta) end = Math.min(total, delta * 2 + 1)

  // If near the end, shift start back
  if (current >= total - delta) start = Math.max(1, total - delta * 2)

  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

// ── Pagination button component ──
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
        border:       `1px solid ${active ? C.blue : C.borderMd}`,
        background:   active
          ? 'rgba(61,142,248,0.15)'
          : hovered && !disabled ? C.bgHover : C.bgElevated,
        color:        active ? C.blue : disabled ? C.text4 : hovered ? C.text1 : C.text2,
        fontSize:     13,
        fontWeight:   600,
        fontFamily:   'var(--ff-mono)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:   'all 0.15s',
        opacity:      disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ── Skeleton row — shown while loading ──
// Gives user a preview of layout before data arrives
function SkeletonRow() {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '28px 32px 1fr 120px 100px 90px',
      gap:                 14,
      padding:             '12px 18px',
      alignItems:          'center',
      background:          C.bgElevated,
      border:              `1px solid ${C.border}`,
      borderRadius:        12,
    }}>
      {/* Each cell is a shimmer placeholder */}
      <Shimmer width={20} height={12} />
      <Shimmer width={32} height={32} radius="50%" />
      <div>
        <Shimmer width={120} height={13} />
        <Shimmer width={50} height={10} style={{ marginTop: 5 }} />
      </div>
      <Shimmer width={80} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={70} height={13} style={{ marginLeft: 'auto' }} />
      <Shimmer width={55} height={24} style={{ marginLeft: 'auto', borderRadius: 6 }} />
    </div>
  )
}

// ── Shimmer block ── the animated loading placeholder
function Shimmer({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background:   'linear-gradient(90deg, #1e2235 25%, #2a2f4a 50%, #1e2235 75%)',
      backgroundSize: '200% 100%',
      animation:    'shimmer 1.4s infinite',
      flexShrink:   0,
      ...style,
    }} />
  )
}

// ── CoinRow ──
function CoinRow({ coin }) {
  const [hovered, setHovered] = useState(false)
  const change = coin.price_change_percentage_24h
  const isUp   = change >= 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '28px 32px 1fr 120px 100px 90px',
        gap:                 14,
        padding:             '12px 18px',
        alignItems:          'center',
        background:          hovered ? C.bgHover    : C.bgElevated,
        border:              `1px solid ${hovered   ? C.borderMd : C.border}`,
        borderRadius:        12,
        cursor:              'pointer',
        transition:          'all 0.15s',
      }}
    >
      <span style={{ color: C.text4, fontSize: 12, fontFamily: 'var(--ff-mono)' }}>
        {coin.market_cap_rank}
      </span>

      <img
        src={coin.image}
        alt={coin.name}
        style={{ width: 32, height: 32, borderRadius: '50%' }}
      />

      <div>
        <div style={{ color: C.text1, fontWeight: 600, fontSize: 14 }}>
          {coin.name}
        </div>
        <div style={{
          color: C.text3, fontSize: 11,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase', marginTop: 2,
        }}>
          {coin.symbol}
        </div>
      </div>

      <div style={{
        color: C.text1, fontFamily: 'var(--ff-mono)',
        fontWeight: 600, fontSize: 14, textAlign: 'right',
      }}>
        ${coin.current_price?.toLocaleString()}
      </div>

      <div style={{
        color: C.text2, fontFamily: 'var(--ff-mono)',
        fontSize: 13, textAlign: 'right',
      }}>
        {fmtLarge(coin.market_cap)}
      </div>

      <div style={{
        color:        isUp ? C.green : C.red,
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
    </div>
  )
}