import { useState, useEffect } from 'react'
import { fetchGlobal } from '../utils/marketAPI'
import { TrendingUp, TrendingDown } from 'lucide-react'

function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function TickerBar() {
  const [global,  setGlobal]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchGlobal()
      setGlobal(data?.data || null)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !global) return (
    <div style={{
      height:       28,
      background:   'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
    }} />
  )

  const totalMcap  = global.total_market_cap?.usd
  const totalVol   = global.total_volume?.usd
  const btcDom     = global.market_cap_percentage?.btc
  const ethDom     = global.market_cap_percentage?.eth
  const mcapChange = global.market_cap_change_percentage_24h_usd
  const activeCoin = global.active_cryptocurrencies
  const isUp       = mcapChange >= 0

  const items = [
    { label: 'Market Cap',   value: fmtLarge(totalMcap) },
    { label: '24h Volume',   value: fmtLarge(totalVol)  },
    { label: 'BTC Dom',      value: `${btcDom?.toFixed(1)}%` },
    { label: 'ETH Dom',      value: `${ethDom?.toFixed(1)}%` },
    { label: 'Active Coins', value: activeCoin?.toLocaleString() },
    {
      label: '24h Change',
      value: `${isUp ? '+' : ''}${mcapChange?.toFixed(2)}%`,
      color: isUp ? 'var(--green)' : 'var(--red)',
      icon:  isUp
        ? <TrendingUp   size={11} />
        : <TrendingDown size={11} />,
    },
  ]

  return (
    <>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display:   flex;
          width:     max-content;
          animation: ticker 25s linear infinite;
        }
        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div style={{
        position:     'fixed',
        top:          52,
        left:         0,
        right:        0,
        height:       28,
        background:   'var(--bg-base)',
        borderBottom: '1px solid var(--border)',
        zIndex:       99,
        overflow:     'hidden',
        display:      'flex',
        alignItems:   'center',
      }}>

        {/* Left fade */}
        <div style={{
          position:      'absolute',
          left:          0, top: 0, bottom: 0,
          width:         60,
          background:    'linear-gradient(to right, var(--bg-base), transparent)',
          zIndex:        2,
          pointerEvents: 'none',
        }} />

        {/* Right fade */}
        <div style={{
          position:      'absolute',
          right:         0, top: 0, bottom: 0,
          width:         60,
          background:    'linear-gradient(to left, var(--bg-base), transparent)',
          zIndex:        2,
          pointerEvents: 'none',
        }} />

        {/* 
          Duplicate items 4x so there's always content visible.
          Animation moves exactly -50% so when first half exits,
          second half is in the exact same starting position → seamless loop
        */}
        <div className="ticker-inner">
          {[...items, ...items, ...items, ...items].map((item, i) => (
            <TickerItem key={i} item={item} />
          ))}
        </div>

      </div>
    </>
  )
}

function TickerItem({ item }) {
  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         6,
      padding:     '0 28px',
      borderRight: '1px solid var(--border)',
      whiteSpace:  'nowrap',
      height:      28,
    }}>
      <span style={{
        color:      'var(--text3)',
        fontSize:   11,
        fontWeight: 500,
      }}>
        {item.label}
      </span>
      <span style={{
        color:      item.color || 'var(--text1)',
        fontSize:   11,
        fontWeight: 700,
        fontFamily: 'var(--ff-mono)',
        display:    'flex',
        alignItems: 'center',
        gap:        3,
      }}>
        {item.icon}
        {item.value}
      </span>
    </div>
  )
}