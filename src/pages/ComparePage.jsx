import { useState, useEffect } from 'react'
import { GitCompare }          from 'lucide-react'
import { fetchSearch, fetchCoinDetail } from '../utils/marketAPI'
import { useCurrency, CURRENCIES }      from '../context/CurrencyContext'
import { usePageTitle }                 from '../hooks/usePageTitle'

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

function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

// All the metrics we compare
const METRICS = [
  { key: 'price',       label: 'Current Price',      fmt: (v, c) => fmtPrice(v, c) },
  { key: 'marketCap',   label: 'Market Cap',          fmt: (v) => fmtLarge(v) },
  { key: 'volume',      label: '24h Volume',          fmt: (v) => fmtLarge(v) },
  { key: 'change24h',   label: '24h Change',          fmt: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', color: true },
  { key: 'change7d',    label: '7d Change',           fmt: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', color: true },
  { key: 'ath',         label: 'All Time High',       fmt: (v, c) => fmtPrice(v, c) },
  { key: 'athChange',   label: 'ATH Change %',        fmt: (v) => v != null ? `${v.toFixed(2)}%` : '—', color: true },
  { key: 'rank',        label: 'Market Cap Rank',     fmt: (v) => v ? `#${v}` : '—' },
  { key: 'supply',      label: 'Circulating Supply',  fmt: (v) => v ? v.toLocaleString() : '—' },
  { key: 'maxSupply',   label: 'Max Supply',          fmt: (v) => v ? v.toLocaleString() : '∞' },
]

// Extract metrics from CoinGecko coin detail object
function extractMetrics(coin, currency) {
  if (!coin) return {}
  const md = coin.market_data
  return {
    price:     md?.current_price?.[currency],
    marketCap: md?.market_cap?.[currency],
    volume:    md?.total_volume?.[currency],
    change24h: md?.price_change_percentage_24h,
    change7d:  md?.price_change_percentage_7d,
    ath:       md?.ath?.[currency],
    athChange: md?.ath_change_percentage?.[currency],
    rank:      coin.market_cap_rank,
    supply:    md?.circulating_supply,
    maxSupply: md?.max_supply,
  }
}

export default function ComparePage() {
  usePageTitle('Compare')
  const { currency } = useCurrency()

  const [coinA, setCoinA] = useState(null)
  const [coinB, setCoinB] = useState(null)

  const metricsA = extractMetrics(coinA, currency)
  const metricsB = extractMetrics(coinB, currency)

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(61,142,248,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GitCompare size={18} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--ff-display)' }}>
            Compare Coins
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Side by side comparison of any two cryptocurrencies
          </p>
        </div>
      </div>

      {/* Two coin selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <CoinSelector
          label="Coin A"
          selected={coinA}
          onSelect={setCoinA}
          accentColor="var(--blue)"
        />
        <CoinSelector
          label="Coin B"
          selected={coinB}
          onSelect={setCoinB}
          accentColor="var(--purple)"
        />
      </div>

      {/* Comparison table — only show when both selected */}
      {coinA && coinB && (
        <div style={{
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border)',
          borderRadius: 14,
          overflow:     'hidden',
        }}>

          {/* Table header */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            background:          'var(--bg-hover)',
            borderBottom:        '1px solid var(--border)',
          }}>
            <CoinHeader coin={coinA} color="var(--blue)" />
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          'var(--text3)',
              fontSize:       12,
              fontWeight:     700,
              padding:        '14px',
            }}>
              VS
            </div>
            <CoinHeader coin={coinB} color="var(--purple)" />
          </div>

          {/* Metric rows */}
          {METRICS.map(({ key, label, fmt, color }) => {
            const valA = metricsA[key]
            const valB = metricsB[key]

            // Determine which coin is "winning" for numeric metrics
            const aWins = typeof valA === 'number' && typeof valB === 'number' && valA > valB
            const bWins = typeof valA === 'number' && typeof valB === 'number' && valB > valA

            return (
              <div
                key={key}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  borderBottom:        '1px solid var(--border)',
                }}
              >
                {/* Coin A value */}
                <div style={{
                  padding:    '13px 20px',
                  textAlign:  'right',
                  fontFamily: 'var(--ff-mono)',
                  fontSize:   13,
                  fontWeight: 600,
                  color:      color && valA != null
                    ? valA >= 0 ? 'var(--green)' : 'var(--red)'
                    : aWins ? 'var(--green)' : 'var(--text1)',
                }}>
                  {fmt(valA, currency)}
                </div>

                {/* Label */}
                <div style={{
                  padding:        '13px 8px',
                  textAlign:      'center',
                  color:          'var(--text3)',
                  fontSize:       12,
                  fontWeight:     500,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  borderLeft:     '1px solid var(--border)',
                  borderRight:    '1px solid var(--border)',
                }}>
                  {label}
                </div>

                {/* Coin B value */}
                <div style={{
                  padding:    '13px 20px',
                  textAlign:  'left',
                  fontFamily: 'var(--ff-mono)',
                  fontSize:   13,
                  fontWeight: 600,
                  color:      color && valB != null
                    ? valB >= 0 ? 'var(--green)' : 'var(--red)'
                    : bWins ? 'var(--green)' : 'var(--text1)',
                }}>
                  {fmt(valB, currency)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Prompt if not both selected */}
      {(!coinA || !coinB) && (
        <div style={{
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border)',
          borderRadius: 14,
          padding:      48,
          textAlign:    'center',
          color:        'var(--text3)',
          fontSize:     14,
        }}>
          Select two coins above to compare them
        </div>
      )}
    </div>
  )
}

// ── Coin selector with search ──
function CoinSelector({ label, selected, onSelect, accentColor }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const [coinData, setCoinData] = useState(null)

  // Fetch full coin detail when selected
  useEffect(() => {
    if (!selected) { setCoinData(null); return }
    fetchCoinDetail(selected.id).then(({ data }) => setCoinData(data))
  }, [selected])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data } = await fetchSearch(query)
      setResults((data?.coins || []).slice(0, 6))
      setLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       `1px solid ${open ? accentColor : 'var(--border)'}`,
      borderRadius: 14,
      padding:      16,
      transition:   'border-color 0.15s',
    }}>
      <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {label}
      </div>

      {/* Selected coin display */}
      {selected && !open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={selected.thumb} alt={selected.name}
            style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 15 }}>
              {selected.name}
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 11,
              fontFamily: 'var(--ff-mono)', textTransform: 'uppercase' }}>
              {selected.symbol}
            </div>
          </div>
          <button
            onClick={() => { onSelect(null); setQuery(''); setOpen(true) }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text3)', cursor: 'pointer', fontSize: 12,
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Search coin..."
            style={{
              width:        '100%',
              padding:      '9px 12px',
              background:   'var(--bg-base)',
              border:       '1px solid var(--border-md)',
              borderRadius: 8,
              color:        'var(--text1)',
              fontSize:     13,
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
          {results.length > 0 && (
            <div style={{
              position:     'absolute',
              top:          'calc(100% + 4px)',
              left: 0, right: 0,
              background:   'var(--bg-elevated)',
              border:       '1px solid var(--border-md)',
              borderRadius: 10,
              overflow:     'hidden',
              zIndex:       50,
              boxShadow:    'var(--shadow-lg)',
            }}>
              {results.map(coin => (
                <SearchRow
                  key={coin.id}
                  coin={coin}
                  onSelect={() => {
                    onSelect(coin)
                    setOpen(false)
                    setQuery('')
                    setResults([])
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CoinHeader({ coin, color }) {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        10,
      padding:    '14px 20px',
    }}>
      <img src={coin.thumb} alt={coin.name}
        style={{ width: 32, height: 32, borderRadius: '50%' }} />
      <div>
        <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 14 }}>
          {coin.name}
        </div>
        <div style={{ color, fontSize: 11,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase' }}>
          {coin.symbol}
        </div>
      </div>
    </div>
  )
}

function SearchRow({ coin, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
    >
      <img src={coin.thumb} alt={coin.name}
        style={{ width: 24, height: 24, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>
          {coin.name}
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 10,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase' }}>
          {coin.symbol}
        </div>
      </div>
      {coin.market_cap_rank && (
        <span style={{ color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--ff-mono)' }}>
          #{coin.market_cap_rank}
        </span>
      )}
    </div>
  )
}