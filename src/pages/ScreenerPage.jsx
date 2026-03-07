import { useState, useEffect, useMemo } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { SlidersHorizontal, X }         from 'lucide-react'
import { fetchMarkets }                 from '../utils/marketAPI'
import { useCurrency, CURRENCIES }      from '../context/CurrencyContext'
import { usePageTitle }                 from '../hooks/usePageTitle'
import { useWatchlist }                 from '../store/watchlistStore'
import { Star }                         from 'lucide-react'

function fmtPrice(price, currency) {
  if (price == null) return '—'
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  if (currency === 'btc') return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${price.toFixed(price < 0.01  ? 6 : 4)}`
  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

const DEFAULT_FILTERS = {
  minPrice: '', maxPrice: '',
  minMarketCap: '', maxMarketCap: '',
  minVolume: '',
  minChange24h: '', maxChange24h: '',
}

// Column definitions — key must match coin object field name
const COLUMNS = [
  { key: 'market_cap_rank',              label: '#',       width: '40px',  align: 'left',  sortable: true  },
  { key: '__img',                        label: '',        width: '36px',  align: 'left',  sortable: false },
  { key: 'name',                         label: 'Name',    width: '1fr',   align: 'left',  sortable: false },
  { key: 'current_price',               label: 'Price',   width: '120px', align: 'right', sortable: true  },
  { key: 'market_cap',                  label: 'Mkt Cap', width: '120px', align: 'right', sortable: true  },
  { key: 'total_volume',                label: 'Volume',  width: '110px', align: 'right', sortable: true  },
  { key: 'price_change_percentage_24h', label: '24h %',   width: '90px',  align: 'right', sortable: true  },
  { key: 'price_change_percentage_7d_in_currency', label: '7d %', width: '90px', align: 'right', sortable: true },
  { key: '__star',                       label: '',        width: '32px',  align: 'right', sortable: false },
]

const GRID = COLUMNS.map(c => c.width).join(' ')

export default function ScreenerPage() {
  usePageTitle('Screener')
  const { currency }    = useCurrency()
  const navigate        = useNavigate()
  const { toggle, has } = useWatchlist()

  const [coins,     setCoins]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS)
  const [sortKey,   setSortKey]   = useState('market_cap_rank')
  const [sortDir,   setSortDir]   = useState('asc')
  const [showPanel, setShowPanel] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [p1, p2, p3] = await Promise.all([
        fetchMarkets({ page: 1, perPage: 100, currency }),
        fetchMarkets({ page: 2, perPage: 100, currency }),
        fetchMarkets({ page: 3, perPage: 50,  currency }),
      ])
      setCoins([
        ...(p1.data || []),
        ...(p2.data || []),
        ...(p3.data || []),
      ])
      setLoading(false)
    }
    load()
  }, [currency])

  const handleSort = (key) => {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // Rank sorts asc by default, everything else desc
      setSortDir(key === 'market_cap_rank' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...coins]
    const f = filters

    if (f.minPrice)     result = result.filter(c => (c.current_price ?? 0) >= +f.minPrice)
    if (f.maxPrice)     result = result.filter(c => (c.current_price ?? 0) <= +f.maxPrice)
    if (f.minMarketCap) result = result.filter(c => (c.market_cap    ?? 0) >= +f.minMarketCap * 1e9)
    if (f.maxMarketCap) result = result.filter(c => (c.market_cap    ?? 0) <= +f.maxMarketCap * 1e9)
    if (f.minVolume)    result = result.filter(c => (c.total_volume  ?? 0) >= +f.minVolume * 1e6)
    if (f.minChange24h) result = result.filter(c => (c.price_change_percentage_24h ?? 0) >= +f.minChange24h)
    if (f.maxChange24h) result = result.filter(c => (c.price_change_percentage_24h ?? 0) <= +f.maxChange24h)

    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      // Treat null/undefined as worst value
      if (aVal == null) aVal = sortDir === 'asc' ? Infinity : -Infinity
      if (bVal == null) bVal = sortDir === 'asc' ? Infinity : -Infinity
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [coins, filters, sortKey, sortDir])

  const hasFilters = Object.values(filters).some(v => v !== '')

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
            <SlidersHorizontal size={18} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Screener
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              {loading ? 'Loading coins...' : `${filtered.length} / ${coins.length} coins match`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {hasFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid var(--red)',
                background: 'rgba(244,63,94,0.08)',
                color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowPanel(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border-md)',
              background: showPanel ? 'var(--bg-hover)' : 'transparent',
              color: showPanel ? 'var(--blue)' : 'var(--text3)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={12} />
            Filters
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showPanel && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 16,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        }}>
          <FilterInput label="Min Price ($)"      value={filters.minPrice}     onChange={v => setFilters(f => ({ ...f, minPrice: v }))}     placeholder="e.g. 1" />
          <FilterInput label="Max Price ($)"      value={filters.maxPrice}     onChange={v => setFilters(f => ({ ...f, maxPrice: v }))}     placeholder="e.g. 100000" />
          <FilterInput label="Min Market Cap (B)" value={filters.minMarketCap} onChange={v => setFilters(f => ({ ...f, minMarketCap: v }))} placeholder="e.g. 1" />
          <FilterInput label="Max Market Cap (B)" value={filters.maxMarketCap} onChange={v => setFilters(f => ({ ...f, maxMarketCap: v }))} placeholder="e.g. 1000" />
          <FilterInput label="Min Volume (M)"     value={filters.minVolume}    onChange={v => setFilters(f => ({ ...f, minVolume: v }))}    placeholder="e.g. 100" />
          <FilterInput label="Min 24h Change (%)" value={filters.minChange24h} onChange={v => setFilters(f => ({ ...f, minChange24h: v }))} placeholder="e.g. 5" />
          <FilterInput label="Max 24h Change (%)" value={filters.maxChange24h} onChange={v => setFilters(f => ({ ...f, maxChange24h: v }))} placeholder="e.g. -5" />
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
      }}>

        {/* Column headers — clickable to sort */}
        <div style={{
          display: 'grid', gridTemplateColumns: GRID,
          gap: 8, padding: '10px 16px',
          borderBottom: '2px solid var(--border)',
          background: 'var(--bg-base)',
        }}>
          {COLUMNS.map(col => {
            const active = sortKey === col.key
            if (!col.sortable) return (
              <div key={col.key} />
            )
            return (
              <div
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  textAlign: col.align,
                  color: active ? 'var(--blue)' : 'var(--text3)',
                  fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                  gap: 3,
                  transition: 'color 0.15s',
                }}
              >
                {col.label}
                {active && (
                  <span style={{ fontSize: 10 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Rows */}
        {loading
          ? Array.from({ length: 20 }).map((_, i) => <SkeletonRow key={i} />)
          : filtered.map((coin, i) => (
            <ScreenerRow
              key={coin.id}
              coin={coin}
              rank={i + 1}
              currency={currency}
              isWatched={has(coin.id)}
              onWatch={e => { e.stopPropagation(); toggle(coin.id) }}
              onClick={() => navigate(`/coin/${coin.id}`)}
            />
          ))
        }

        {!loading && filtered.length === 0 && (
          <div style={{
            padding: 48, textAlign: 'center',
            color: 'var(--text3)', fontSize: 14,
          }}>
            No coins match your filters. Try relaxing the criteria.
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div style={{ color: 'var(--text4)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
          Showing {filtered.length} coins · Click column headers to sort
        </div>
      )}
    </div>
  )
}

function ScreenerRow({ coin, rank, currency, isWatched, onWatch, onClick }) {
  const [hovered, setHovered] = useState(false)
  const c24 = coin.price_change_percentage_24h
  const c7d  = coin.price_change_percentage_7d_in_currency

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: GRID,
        gap: 8, padding: '10px 16px', alignItems: 'center',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
    >
      <span style={{ color: 'var(--text4)', fontSize: 11,
        fontFamily: 'var(--ff-mono)' }}>
        {coin.market_cap_rank || rank}
      </span>

      <img src={coin.image} alt={coin.name}
        style={{ width: 32, height: 32, borderRadius: '50%' }} />

      <div>
        <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
          {coin.name}
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 10,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase', marginTop: 1 }}>
          {coin.symbol}
        </div>
      </div>

      <div style={{ color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
        fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
        {fmtPrice(coin.current_price, currency)}
      </div>

      <div style={{ color: 'var(--text2)', fontFamily: 'var(--ff-mono)',
        fontSize: 12, textAlign: 'right' }}>
        {fmtLarge(coin.market_cap)}
      </div>

      <div style={{ color: 'var(--text2)', fontFamily: 'var(--ff-mono)',
        fontSize: 12, textAlign: 'right' }}>
        {fmtLarge(coin.total_volume)}
      </div>

      <div style={{
        textAlign: 'right', fontFamily: 'var(--ff-mono)',
        fontSize: 13, fontWeight: 600,
        color: c24 == null ? 'var(--text3)' : c24 >= 0 ? 'var(--green)' : 'var(--red)',
      }}>
        {c24 != null ? `${c24 >= 0 ? '+' : ''}${c24.toFixed(2)}%` : '—'}
      </div>

      <div style={{
        textAlign: 'right', fontFamily: 'var(--ff-mono)',
        fontSize: 13, fontWeight: 600,
        color: c7d == null ? 'var(--text3)' : c7d >= 0 ? 'var(--green)' : 'var(--red)',
      }}>
        {c7d != null ? `${c7d >= 0 ? '+' : ''}${c7d.toFixed(2)}%` : '—'}
      </div>

      <button
        onClick={onWatch}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26, borderRadius: 6,
          border: 'none', background: 'transparent', cursor: 'pointer',
          marginLeft: 'auto',
        }}
      >
        <Star size={13}
          fill={isWatched ? 'var(--gold)' : 'none'}
          color={isWatched ? 'var(--gold)' : 'var(--text4)'}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600,
        display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px',
          background: 'var(--bg-base)', border: '1px solid var(--border-md)',
          borderRadius: 7, color: 'var(--text1)', fontSize: 13,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: GRID,
      gap: 8, padding: '10px 16px', alignItems: 'center',
      borderBottom: '1px solid var(--border)',
    }}>
      {[16, 32, 120, 80, 80, 70, 60, 60, 20].map((w, i) => (
        <div key={i} style={{
          width: w, height: i === 1 ? 32 : 13,
          borderRadius: i === 1 ? '50%' : 4,
          background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          marginLeft: i >= 3 ? 'auto' : 0,
        }} />
      ))}
    </div>
  )
}
