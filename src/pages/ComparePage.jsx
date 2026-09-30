import { useState, useEffect } from 'react'
import { GitCompare } from 'lucide-react'
import { fetchSearch, fetchCoinDetail } from '../utils/marketAPI'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { usePageTitle } from '../hooks/usePageTitle'

function fmtPrice(price, currency) {
  if (price == null) return '—'
  if (currency === 'btc') return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${price.toFixed(price < 0.01 ? 6 : 4)}`
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
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

const METRICS = [
  { key: 'price',       label: 'Current Price',     fmt: (v, c) => fmtPrice(v, c),  higher: true  },
  { key: 'marketCap',   label: 'Market Cap',         fmt: (v)    => fmtLarge(v),     higher: true  },
  { key: 'volume',      label: '24h Volume',         fmt: (v)    => fmtLarge(v),     higher: true  },
  { key: 'change24h',   label: '24h Change',         fmt: (v)    => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', color: true },
  { key: 'change7d',    label: '7d Change',          fmt: (v)    => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', color: true },
  { key: 'ath',         label: 'All Time High',      fmt: (v, c) => fmtPrice(v, c),  higher: true  },
  { key: 'athChange',   label: 'ATH Change %',       fmt: (v)    => v != null ? `${v.toFixed(2)}%` : '—', color: true },
  { key: 'rank',        label: 'Market Cap Rank',    fmt: (v)    => v ? `#${v}` : '—', higher: false },
  { key: 'supply',      label: 'Circulating Supply', fmt: (v)    => v ? v.toLocaleString() : '—', higher: true },
  { key: 'maxSupply',   label: 'Max Supply',         fmt: (v)    => v ? v.toLocaleString() : '∞' },
]

function extractMetrics(coin, currency) {
  if (!coin?.market_data) return {}
  const md = coin.market_data
  return {
    price:     md.current_price?.[currency],
    marketCap: md.market_cap?.[currency],
    volume:    md.total_volume?.[currency],
    change24h: md.price_change_percentage_24h,
    change7d:  md.price_change_percentage_7d,
    ath:       md.ath?.[currency],
    athChange: md.ath_change_percentage?.[currency],
    rank:      coin.market_cap_rank,
    supply:    md.circulating_supply,
    maxSupply: md.max_supply,
  }
}

export default function ComparePage() {
  usePageTitle('Compare')
  const { currency } = useCurrency()

  const [selectedA, setSelectedA] = useState(null)
  const [selectedB, setSelectedB] = useState(null)
  const [fullA, setFullA] = useState(null)
  const [fullB, setFullB] = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  useEffect(() => {
    if (!selectedA) { setFullA(null); return }
    setLoadingA(true)
    fetchCoinDetail(selectedA.id).then(({ data }) => {
      setFullA(data)
      setLoadingA(false)
    })
  }, [selectedA])

  useEffect(() => {
    if (!selectedB) { setFullB(null); return }
    setLoadingB(true)
    fetchCoinDetail(selectedB.id).then(({ data }) => {
      setFullB(data)
      setLoadingB(false)
    })
  }, [selectedB])

  const metricsA = extractMetrics(fullA, currency)
  const metricsB = extractMetrics(fullB, currency)
  const bothSelected  = selectedA && selectedB
  const bothLoaded    = fullA && fullB
  const anyLoading    = loadingA || loadingB

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">

      {/* Header */}
      <div className="flex items-center gap-[10px] mb-7">
        <div className="w-9 h-9 rounded-[10px] bg-[rgba(61,142,248,0.12)] flex items-center justify-center">
          <GitCompare size={18} className="text-blue" />
        </div>
        <div>
          <h1 className="text-text-1 text-[22px] font-bold font-display">Compare Coins</h1>
          <p className="text-text-3 text-[13px] mt-0.5">Side by side comparison of any two cryptocurrencies</p>
        </div>
      </div>

      {/* Two coin selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <CoinSelector
          label="COIN A"
          selected={selectedA}
          onSelect={setSelectedA}
          accentColor="var(--blue)"
          loading={loadingA}
        />
        <CoinSelector
          label="COIN B"
          selected={selectedB}
          onSelect={setSelectedB}
          accentColor="var(--purple)"
          loading={loadingB}
        />
      </div>

      {/* Loading state */}
      {bothSelected && anyLoading && (
        <div className="p-8 text-center bg-bg-elevated border border-border rounded-[14px] text-text-3 text-sm">
          Loading coin data...
        </div>
      )}

      {/* Comparison table */}
      {bothSelected && bothLoaded && !anyLoading && (
        <div className="bg-bg-elevated border border-border rounded-[14px] overflow-hidden shadow-sm">

          {/* Table header */}
          <div className="grid grid-cols-[1fr_160px_1fr] bg-bg-hover border-b border-border">
            <CoinHeader coin={selectedA} coinData={fullA} color="var(--blue)" align="left" />
            <div className="flex items-center justify-center text-text-3 text-[13px] font-extrabold p-3.5 tracking-[0.1em] border-l border-r border-border">
              VS
            </div>
            <CoinHeader coin={selectedB} coinData={fullB} color="var(--purple)" align="right" />
          </div>

          {/* Metric rows */}
          {METRICS.map(({ key, label, fmt, color, higher }) => {
            const valA = metricsA[key]
            const valB = metricsB[key]

            let aWins = false, bWins = false
            if (!color && typeof valA === 'number' && typeof valB === 'number' && valA !== valB) {
              if (higher === false) {
                aWins = valA < valB
                bWins = valB < valA
              } else if (higher) {
                aWins = valA > valB
                bWins = valB > valA
              }
            }

            return (
              <div key={key} className="grid grid-cols-[1fr_160px_1fr] border-b border-border last:border-0">
                {/* Coin A value */}
                <div className={`p-[14px_24px] text-right font-mono text-sm font-bold flex items-center justify-end gap-1.5 transition-colors
                  ${color && valA != null ? (valA >= 0 ? 'text-green-500' : 'text-red-500') : (aWins ? 'text-green-500 bg-green-500/[0.04]' : 'text-text-1')}`}>
                  {aWins && <span className="text-[10px]">👑</span>}
                  {fmt(valA, currency)}
                </div>

                {/* Label */}
                <div className="p-[14px_8px] text-center text-text-3 text-[12px] font-medium flex items-center justify-center border-l border-r border-border bg-bg-base">
                  {label}
                </div>

                {/* Coin B value */}
                <div className={`p-[14px_24px] text-left font-mono text-sm font-bold flex items-center gap-1.5 transition-colors
                  ${color && valB != null ? (valB >= 0 ? 'text-green-500' : 'text-red-500') : (bWins ? 'text-green-500 bg-green-500/[0.04]' : 'text-text-1')}`}>
                  {fmt(valB, currency)}
                  {bWins && <span className="text-[10px]">👑</span>}
                </div>
              </div>
            )
          })}

          {/* Winner summary */}
          {(() => {
            let aScore = 0, bScore = 0
            METRICS.forEach(({ key, color, higher }) => {
              if (color) return
              const valA = metricsA[key], valB = metricsB[key]
              if (typeof valA !== 'number' || typeof valB !== 'number' || valA === valB) return
              if (higher === false) { valA < valB ? aScore++ : bScore++ }
              else if (higher)      { valA > valB ? aScore++ : bScore++ }
            })
            const winner = aScore > bScore ? selectedA : aScore < bScore ? selectedB : null
            return (
              <div className="p-[14px_24px] text-center bg-bg-base text-text-2 text-[13px] font-semibold border-t border-border">
                {winner
                  ? <>🏆 <span className={`font-extrabold ${aScore > bScore ? 'text-blue' : 'text-purple'}`}>{winner.name}</span> wins {Math.max(aScore,bScore)}-{Math.min(aScore,bScore)} on fundamental metrics</>
                  : '🤝 Even match across fundamental metrics'
                }
              </div>
            )
          })()}
        </div>
      )}

      {/* Prompt */}
      {(!selectedA || !selectedB) && (
        <div className="bg-bg-elevated border border-border rounded-[14px] p-12 text-center text-text-3 text-sm">
          Select two coins above to compare them
        </div>
      )}
    </div>
  )
}

function CoinSelector({ label, selected, onSelect, accentColor, loading }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      queueMicrotask(() => setResults([]))
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await fetchSearch(query)
      setResults((data?.coins || []).slice(0, 6))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (coin) => {
    onSelect(coin)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <div 
      className="bg-bg-elevated border rounded-[14px] p-4 transition-all duration-150"
      style={{ borderColor: open ? accentColor : 'var(--border)' }}
    >
      <div className="text-text-3 text-[11px] font-bold uppercase tracking-[0.08em] mb-2.5 ml-1">
        {label}
      </div>

      {selected && !open ? (
        <div className="flex items-center gap-[10px]">
          <img src={selected.thumb} alt={selected.name} className="w-9 h-9 rounded-full" />
          <div className="flex-1">
            <div className="text-text-1 font-bold text-[15px] leading-tight">{selected.name}</div>
            <div className="text-text-3 text-[11px] font-mono uppercase tracking-tight">{selected.symbol}</div>
          </div>
          {loading && <span className="text-text-4 text-[11px] animate-pulse">Loading...</span>}
          <button
            onClick={() => { onSelect(null); setQuery(''); setOpen(true) }}
            className="bg-bg-hover border border-border rounded-md text-text-3 text-[11px] font-semibold px-2.5 py-1 hover:border-blue transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search coin..."
            className="w-full p-[9px_12px] bg-bg-base border border-border-md rounded-lg text-text-1 text-[13px] outline-none placeholder:text-text-4 focus:border-blue transition-colors"
          />
          {results.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-bg-elevated border border-border-md rounded-[10px] overflow-hidden z-50 shadow-lg">
              {results.map(coin => (
                <SearchRow key={coin.id} coin={coin} onSelect={() => handleSelect(coin)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CoinHeader({ coin, color, align }) {
  return (
    <div className={`flex items-center gap-[10px] p-[14px_24px] ${align === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
      <img src={coin.thumb} alt={coin.name} className="w-9 h-9 rounded-full" />
      <div style={{ textAlign: align }}>
        <div className="text-text-1 font-bold text-[15px] leading-tight">{coin.name}</div>
        <div style={{ color }} className="text-[11px] font-mono uppercase font-bold tracking-tight">
          {coin.symbol?.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

function SearchRow({ coin, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-[10px] p-[9px_14px] hover:bg-bg-hover cursor-pointer transition-colors group"
    >
      <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full" />
      <div className="flex-1">
        <div className="text-text-1 text-[13px] font-semibold group-hover:text-blue">{coin.name}</div>
        <div className="text-text-3 text-[10px] font-mono uppercase">{coin.symbol}</div>
      </div>
      {coin.market_cap_rank && (
        <span className="text-text-4 text-[11px] font-mono">#{coin.market_cap_rank}</span>
      )}
    </div>
  )
}