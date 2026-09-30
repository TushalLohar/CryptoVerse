import { useState, useEffect, useMemo } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { SlidersHorizontal, X, Star }   from 'lucide-react'
import { fetchMarkets }                 from '../utils/marketAPI'
import { useCurrency, CURRENCIES }      from '../context/CurrencyContext'
import { usePageTitle }                 from '../hooks/usePageTitle'
import { useWatchlist }                 from '../store/watchlistStore'

// --- Formatting Helpers ---
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

const COLUMNS = [
  { key: 'market_cap_rank',              label: '#',       width: 'w-[50px]',  align: 'text-left',   sortable: true  },
  { key: '__img',                        label: '',        width: 'w-[40px]',  align: 'text-left',   sortable: false },
  { key: 'name',                         label: 'Name',    width: 'flex-1',    align: 'text-left',   sortable: false },
  { key: 'current_price',               label: 'Price',   width: 'w-[130px]', align: 'text-right',  sortable: true  },
  { key: 'market_cap',                  label: 'Mkt Cap', width: 'w-[130px]', align: 'text-right',  sortable: true  },
  { key: 'total_volume',                label: 'Volume',  width: 'w-[120px]', align: 'text-right',  sortable: true  },
  { key: 'price_change_percentage_24h', label: '24h %',   width: 'w-[100px]',  align: 'text-right',  sortable: true  },
  { key: 'price_change_percentage_7d_in_currency', label: '7d %', width: 'w-[100px]', align: 'text-right', sortable: true },
  { key: '__star',                       label: '',        width: 'w-[40px]',  align: 'text-right',  sortable: false },
]

const GRID_COLS_CLASS = "grid grid-cols-[50px_40px_1fr_130px_130px_120px_100px_100px_40px] gap-2 items-center px-4"

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
      try {
        const [p1, p2, p3] = await Promise.all([
          fetchMarkets({ page: 1, perPage: 100, currency }),
          fetchMarkets({ page: 2, perPage: 100, currency }),
          fetchMarkets({ page: 3, perPage: 50,  currency }),
        ])
        setCoins([...(p1.data || []), ...(p2.data || []), ...(p3.data || [])])
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currency])

  // --- FIXED SORTING HANDLER ---
  const handleSort = (key) => {
    if (sortKey === key) {
      // Logic: Use functional update to ensure we always get the latest state toggle
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Default behavior: Rank sorts Ascending, everything else (Price/Vol) sorts Descending first
      setSortDir(key === 'market_cap_rank' ? 'asc' : 'desc')
    }
  }

  const filtered = useMemo(() => {
    // 1. Shallow copy to ensure a new reference
    let result = [...coins]
    const f = filters

    // 2. Apply Filters
    if (f.minPrice)     result = result.filter(c => (c.current_price ?? 0) >= +f.minPrice)
    if (f.maxPrice)     result = result.filter(c => (c.current_price ?? 0) <= +f.maxPrice)
    if (f.minMarketCap) result = result.filter(c => (c.market_cap    ?? 0) >= +f.minMarketCap * 1e9)
    if (f.maxMarketCap) result = result.filter(c => (c.market_cap    ?? 0) <= +f.maxMarketCap * 1e9)
    if (f.minVolume)    result = result.filter(c => (c.total_volume  ?? 0) >= +f.minVolume * 1e6)
    if (f.minChange24h) result = result.filter(c => (c.price_change_percentage_24h ?? 0) >= +f.minChange24h)
    if (f.maxChange24h) result = result.filter(c => (c.price_change_percentage_24h ?? 0) <= +f.maxChange24h)

    // 3. FIXED SORTING COMPARISON
    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      // Handle missing data so they don't break the sort order
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (sortDir === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return result
  }, [coins, filters, sortKey, sortDir])

  const hasFilters = Object.values(filters).some(v => v !== '')

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both] pb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-[var(--blue)]">
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-2xl font-bold font-[var(--ff-display)]">Screener</h1>
            <p className="text-[var(--text3)] text-sm">
              {loading ? 'Fetching data...' : `${filtered.length} assets found`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {hasFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-[var(--red)] text-xs font-bold hover:bg-red-500/10 transition-colors"
            >
              <X size={14} /> Clear
            </button>
          )}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-[var(--border-md)] text-xs font-bold transition-all ${
              showPanel ? 'bg-[var(--bg-hover)] text-[var(--blue)]' : 'text-[var(--text3)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      {showPanel && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-5 mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
          <FilterInput label="Min Price ($)"      value={filters.minPrice}     onChange={v => setFilters(f => ({ ...f, minPrice: v }))}     placeholder="0.01" />
          <FilterInput label="Max Price ($)"      value={filters.maxPrice}     onChange={v => setFilters(f => ({ ...f, maxPrice: v }))}     placeholder="100000" />
          <FilterInput label="Min Mkt Cap (B)"    value={filters.minMarketCap} onChange={v => setFilters(f => ({ ...f, minMarketCap: v }))} placeholder="1" />
          <FilterInput label="Max Mkt Cap (B)"    value={filters.maxMarketCap} onChange={v => setFilters(f => ({ ...f, maxMarketCap: v }))} placeholder="1000" />
          <FilterInput label="Min Vol (M)"        value={filters.minVolume}    onChange={v => setFilters(f => ({ ...f, minVolume: v }))}    placeholder="10" />
          <FilterInput label="Min 24h %"          value={filters.minChange24h} onChange={v => setFilters(f => ({ ...f, minChange24h: v }))} placeholder="5" />
          <FilterInput label="Max 24h %"          value={filters.maxChange24h} onChange={v => setFilters(f => ({ ...f, maxChange24h: v }))} placeholder="-5" />
        </div>
      )}

      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className={`${GRID_COLS_CLASS} py-3.5 border-b-2 border-[var(--border)] bg-[var(--bg-base)]`}>
            {COLUMNS.map(col => {
              const active = sortKey === col.key
              if (!col.sortable) return <div key={col.key} className={col.width} />
              return (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`${col.width} ${col.align} text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors group
                    ${active ? 'text-[var(--blue)]' : 'text-[var(--text3)] hover:text-[var(--text1)]'}
                    ${col.align === 'text-right' ? 'justify-end' : 'justify-start'}`}
                >
                  {col.label}
                  <span className={`text-[10px] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="divide-y divide-[var(--border)]">
            {loading
              ? Array.from({ length: 15 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((coin) => (
                <ScreenerRow
                  key={coin.id}
                  coin={coin}
                  rank={coin.market_cap_rank}
                  currency={currency}
                  isWatched={has(coin.id)}
                  onWatch={e => { e.stopPropagation(); toggle(coin.id) }}
                  onClick={() => navigate(`/coin/${coin.id}`)}
                />
              ))
            }
          </div>

          {!loading && filtered.length === 0 && (
            <div className="py-24 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-[var(--text3)] font-medium">No assets match your current filters.</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4 text-[var(--blue)] text-sm font-bold hover:underline">Reset all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScreenerRow({ coin, rank, currency, isWatched, onWatch, onClick }) {
  const c24 = coin.price_change_percentage_24h
  const c7d  = coin.price_change_percentage_7d_in_currency

  return (
    <div
      onClick={onClick}
      className={`${GRID_COLS_CLASS} py-3 transition-all cursor-pointer hover:bg-[var(--bg-hover)] group border-l-4 border-transparent hover:border-[var(--blue)]`}
    >
      <span className="text-[var(--text4)] text-[11px] font-mono font-bold">
        {rank || '—'}
      </span>
      <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shadow-sm" />
      <div className="flex flex-col min-w-0">
        <span className="text-[var(--text1)] font-bold text-sm truncate">{coin.name}</span>
        <span className="text-[var(--text3)] text-[10px] font-mono uppercase font-bold">{coin.symbol}</span>
      </div>
      <div className="text-[var(--text1)] font-mono text-[13px] font-bold text-right">
        {fmtPrice(coin.current_price, currency)}
      </div>
      <div className="text-[var(--text2)] font-mono text-xs text-right">
        {fmtLarge(coin.market_cap)}
      </div>
      <div className="text-[var(--text2)] font-mono text-xs text-right">
        {fmtLarge(coin.total_volume)}
      </div>
      <div className={`text-right font-mono text-[13px] font-bold ${c24 == null ? 'text-[var(--text3)]' : c24 >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {c24 != null ? `${c24 >= 0 ? '+' : ''}${c24.toFixed(2)}%` : '—'}
      </div>
      <div className={`text-right font-mono text-[13px] font-bold ${c7d == null ? 'text-[var(--text3)]' : c7d >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {c7d != null ? `${c7d >= 0 ? '+' : ''}${c7d.toFixed(2)}%` : '—'}
      </div>
      <button
        onClick={onWatch}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-amber-500/10 transition-colors ml-auto group/star"
      >
        <Star size={15}
          fill={isWatched ? 'var(--gold)' : 'none'}
          className={`${isWatched ? 'text-[var(--gold)]' : 'text-[var(--text4)] group-hover/star:text-[var(--text2)]'} transition-colors`}
          strokeWidth={2.5}
        />
      </button>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[var(--text3)] text-[10px] font-black uppercase tracking-widest ml-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-md)] rounded-xl text-[var(--text1)] text-[13px] font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[var(--blue)] transition-all"
      />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className={`${GRID_COLS_CLASS} py-4 animate-pulse opacity-50`}>
      <div className="w-4 h-3 bg-[var(--bg-hover)] rounded" />
      <div className="w-8 h-8 bg-[var(--bg-hover)] rounded-full" />
      <div className="space-y-2">
        <div className="w-24 h-3 bg-[var(--bg-hover)] rounded" />
        <div className="w-12 h-2 bg-[var(--bg-hover)] rounded" />
      </div>
      <div className="w-20 h-3 bg-[var(--bg-hover)] rounded ml-auto" />
      <div className="w-20 h-3 bg-[var(--bg-hover)] rounded ml-auto" />
      <div className="w-20 h-3 bg-[var(--bg-hover)] rounded ml-auto" />
      <div className="w-14 h-3 bg-[var(--bg-hover)] rounded ml-auto" />
      <div className="w-14 h-3 bg-[var(--bg-hover)] rounded ml-auto" />
      <div className="w-6 h-6 bg-[var(--bg-hover)] rounded-full ml-auto" />
    </div>
  )
}