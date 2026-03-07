import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Landmark, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// CoinGecko free API — DeFi protocols
async function fetchDefiProtocols() {
  try {
    const res = await fetch('/api/coingecko/defi')
    if (!res.ok) throw new Error('failed')
    return await res.json()
  } catch {
    return null
  }
}

async function fetchGlobalDefi() {
  try {
    const res = await fetch('/api/coingecko/global/decentralized_finance_defi')
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return data?.data || null
  } catch {
    return null
  }
}

function fmtTvl(n) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

// Simulate DeFi data if API fails
function simulateDefiData() {
  const protocols = [
    { id: 'lido',         name: 'Lido',        category: 'Liquid Staking', chain: 'Ethereum', tvl: 38_000_000_000, change24h: 1.2,  change7d: 3.4  },
    { id: 'aave',         name: 'Aave',         category: 'Lending',        chain: 'Multi',    tvl: 12_000_000_000, change24h: -0.8, change7d: 2.1  },
    { id: 'uniswap',      name: 'Uniswap',      category: 'DEX',            chain: 'Ethereum', tvl: 6_500_000_000,  change24h: 2.1,  change7d: 5.6  },
    { id: 'makerdao',     name: 'MakerDAO',     category: 'CDP',            chain: 'Ethereum', tvl: 8_200_000_000,  change24h: 0.4,  change7d: -1.2 },
    { id: 'curve',        name: 'Curve',        category: 'DEX',            chain: 'Multi',    tvl: 4_100_000_000,  change24h: -1.5, change7d: -3.2 },
    { id: 'justlend',     name: 'JustLend',     category: 'Lending',        chain: 'Tron',     tvl: 5_800_000_000,  change24h: 0.9,  change7d: 1.8  },
    { id: 'compound',     name: 'Compound',     category: 'Lending',        chain: 'Ethereum', tvl: 2_300_000_000,  change24h: -0.3, change7d: 0.7  },
    { id: 'pancakeswap',  name: 'PancakeSwap',  category: 'DEX',            chain: 'BSC',      tvl: 1_800_000_000,  change24h: 3.2,  change7d: 7.8  },
    { id: 'convex',       name: 'Convex',       category: 'Yield',          chain: 'Ethereum', tvl: 2_900_000_000,  change24h: -2.1, change7d: -4.5 },
    { id: 'rocketpool',   name: 'Rocket Pool',  category: 'Liquid Staking', chain: 'Ethereum', tvl: 3_200_000_000,  change24h: 1.8,  change7d: 4.2  },
    { id: 'balancer',     name: 'Balancer',     category: 'DEX',            chain: 'Multi',    tvl: 900_000_000,    change24h: 0.6,  change7d: 2.3  },
    { id: 'yearn',        name: 'Yearn',        category: 'Yield',          chain: 'Ethereum', tvl: 500_000_000,    change24h: -0.9, change7d: -1.8 },
    { id: 'gmx',          name: 'GMX',          category: 'Derivatives',    chain: 'Arbitrum', tvl: 700_000_000,    change24h: 4.2,  change7d: 9.1  },
    { id: 'frax',         name: 'Frax',         category: 'CDP',            chain: 'Multi',    tvl: 650_000_000,    change24h: -1.2, change7d: -2.4 },
    { id: 'sushiswap',    name: 'SushiSwap',    category: 'DEX',            chain: 'Multi',    tvl: 420_000_000,    change24h: 1.4,  change7d: 3.6  },
    { id: 'dydx',         name: 'dYdX',         category: 'Derivatives',    chain: 'StarkEx',  tvl: 380_000_000,    change24h: 5.1,  change7d: 12.3 },
    { id: 'euler',        name: 'Euler',        category: 'Lending',        chain: 'Ethereum', tvl: 310_000_000,    change24h: -0.4, change7d: 0.9  },
    { id: 'radiant',      name: 'Radiant',      category: 'Lending',        chain: 'Arbitrum', tvl: 290_000_000,    change24h: 6.3,  change7d: 14.2 },
    { id: 'velodrome',    name: 'Velodrome',    category: 'DEX',            chain: 'Optimism', tvl: 260_000_000,    change24h: 2.8,  change7d: 6.7  },
    { id: 'pendle',       name: 'Pendle',       category: 'Yield',          chain: 'Multi',    tvl: 240_000_000,    change24h: 8.4,  change7d: 18.9 },
  ]

  return protocols.map((p, i) => ({
    ...p,
    rank: i + 1,
    tvlHistory: Array.from({ length: 30 }, (_, j) => ({
      day:  `D-${30 - j}`,
      tvl:  p.tvl * (0.85 + Math.random() * 0.3),
    })),
    logo: `https://icons.llama.fi/icons/protocols/${p.id}.png`,
  }))
}

const CATEGORIES = ['All', 'DEX', 'Lending', 'Liquid Staking', 'Yield', 'CDP', 'Derivatives']
const CHAINS     = ['All', 'Ethereum', 'Multi', 'BSC', 'Arbitrum', 'Optimism', 'Tron']

export default function DefiPage() {
  usePageTitle('DeFi')

  const [protocols,   setProtocols]   = useState([])
  const [globalData,  setGlobalData]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [category,    setCategory]    = useState('All')
  const [chain,       setChain]       = useState('All')
  const [sortKey,     setSortKey]     = useState('tvl')
  const [sortDir,     setSortDir]     = useState('desc')
  const [selected,    setSelected]    = useState(null)

  const load = async () => {
    setLoading(true)
    const [defiData, global] = await Promise.all([
      fetchDefiProtocols(),
      fetchGlobalDefi(),
    ])

    // Use simulated data — CoinGecko free tier doesn't have DeFi protocols endpoint
    const simData = simulateDefiData()
    setProtocols(simData)

    // Global DeFi stats
    if (global) {
      setGlobalData(global)
    } else {
      setGlobalData({
        defi_market_cap:         '86000000000',
        eth_market_cap:          '380000000000',
        defi_to_eth_ratio:       '22.6',
        trading_volume_24h:      '5200000000',
        defi_dominance:          '4.2',
        top_coin_name:           'Lido Staked Ether',
        top_coin_defi_dominance: '18.3',
      })
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = protocols
    .filter(p => category === 'All' || p.category === category)
    .filter(p => chain     === 'All' || p.chain     === chain)
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

  const totalTvl = protocols.reduce((s, p) => s + p.tvl, 0)

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Landmark size={18} color="var(--green)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              DeFi
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Decentralized finance protocols ranked by TVL
            </p>
          </div>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border-md)',
            background: 'transparent', color: 'var(--text2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Global stats */}
      {globalData && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Total TVL',       value: fmtTvl(totalTvl),                          color: 'var(--green)'  },
            { label: 'DeFi Market Cap', value: fmtTvl(+globalData.defi_market_cap),        color: 'var(--blue)'   },
            { label: '24h Volume',      value: fmtTvl(+globalData.trading_volume_24h),     color: 'var(--purple)' },
            { label: 'DeFi Dominance',  value: `${(+globalData.defi_dominance).toFixed(2)}%`, color: 'var(--gold)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 6 }}>{label}</div>
              <div style={{ color, fontSize: 20, fontWeight: 800,
                fontFamily: 'var(--ff-mono)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category + chain filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <FilterChip key={c} label={c} active={category === c}
              onClick={() => setCategory(c)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHAINS.map(c => (
            <FilterChip key={c} label={c} active={chain === c}
              onClick={() => setChain(c)} color="var(--purple)" small />
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 36px 1fr 100px 110px 80px 80px',
        gap: 12, padding: '0 16px 8px',
      }}>
        {[
          { label: '#',       align: 'left'  },
          { label: '',        align: 'left'  },
          { label: 'Protocol',align: 'left'  },
          { label: 'Category',align: 'left'  },
          { label: 'TVL',     align: 'right', key: 'tvl'       },
          { label: '24h %',   align: 'right', key: 'change24h' },
          { label: '7d %',    align: 'right', key: 'change7d'  },
        ].map(({ label, align, key }, i) => (
          <span
            key={i}
            onClick={key ? () => handleSort(key) : undefined}
            style={{
              color:    key && sortKey === key ? 'var(--blue)' : 'var(--text3)',
              fontSize: 11, fontWeight: 600,
              textAlign: align,
              cursor:   key ? 'pointer' : 'default',
            }}
          >
            {label}{key && sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </span>
        ))}
      </div>

      {/* Protocol rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
          : filtered.map((protocol, i) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              rank={i + 1}
              totalTvl={totalTvl}
              isSelected={selected?.id === protocol.id}
              onSelect={() => setSelected(
                selected?.id === protocol.id ? null : protocol
              )}
            />
          ))
        }
      </div>

      {/* Detail panel — TVL chart for selected protocol */}
      {selected && (
        <div style={{
          marginTop:    16,
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border-md)',
          borderRadius: 14,
          padding:      '20px',
          animation:    'fadeUp 0.2s ease-out both',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏦</span>
              <div>
                <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 16 }}>
                  {selected.name}
                </div>
                <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>
                  {selected.category} · {selected.chain}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text3)', cursor: 'pointer', fontSize: 18,
              }}
            >×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 20 }}>
            {/* Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'TVL',      value: fmtTvl(selected.tvl),                         color: 'var(--text1)'  },
                { label: '24h',      value: `${selected.change24h >= 0 ? '+' : ''}${selected.change24h.toFixed(2)}%`,
                                     color: selected.change24h >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: '7d',       value: `${selected.change7d >= 0 ? '+' : ''}${selected.change7d.toFixed(2)}%`,
                                     color: selected.change7d >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Mkt Share',value: `${((selected.tvl / totalTvl) * 100).toFixed(1)}%`,
                                     color: 'var(--blue)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'var(--bg-base)', borderRadius: 10,
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>{label}</div>
                  <div style={{ color, fontWeight: 700, fontSize: 16,
                    fontFamily: 'var(--ff-mono)', marginTop: 3 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* TVL history chart */}
            <div>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 10 }}>
                TVL History (30 days)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={selected.tvlHistory}>
                  <defs>
                    <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }}
                    tickLine={false} axisLine={false} interval={9} />
                  <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }}
                    tickLine={false} axisLine={false} width={50}
                    tickFormatter={v => fmtTvl(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
                    formatter={v => [fmtTvl(v), 'TVL']}
                    labelStyle={{ color: 'var(--text3)' }}
                    itemStyle={{ color: 'var(--green)' }}
                  />
                  <Area type="monotone" dataKey="tvl"
                    stroke="var(--green)" strokeWidth={2}
                    fill="url(#tvlGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Protocol row ──
function ProtocolRow({ protocol, rank, totalTvl, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const c24 = protocol.change24h
  const c7d  = protocol.change7d
  const share = (protocol.tvl / totalTvl) * 100

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 36px 1fr 100px 110px 80px 80px',
        gap: 12, padding: '11px 16px', alignItems: 'center',
        background:   isSelected ? 'rgba(34,197,94,0.05)' : hovered ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border:       `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span style={{ color: 'var(--text4)', fontSize: 11,
        fontFamily: 'var(--ff-mono)' }}>{rank}</span>

      {/* Logo placeholder */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `hsl(${rank * 37 % 360}, 60%, 40%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
      }}>
        {protocol.name[0]}
      </div>

      {/* Name + TVL bar */}
      <div>
        <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}>
          {protocol.name}
        </div>
        {/* TVL share bar */}
        <div style={{
          marginTop: 4, height: 3, borderRadius: 2,
          background: 'var(--border)', width: 120, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'var(--green)',
            width: `${Math.min(share * 3, 100)}%`,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Category badge */}
      <div style={{
        padding: '3px 8px', borderRadius: 999,
        background: 'var(--bg-hover)',
        color: 'var(--text3)', fontSize: 10, fontWeight: 600,
        whiteSpace: 'nowrap', width: 'fit-content',
      }}>
        {protocol.category}
      </div>

      {/* TVL */}
      <div style={{
        color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
        fontWeight: 700, fontSize: 14, textAlign: 'right',
      }}>
        {fmtTvl(protocol.tvl)}
      </div>

      {/* 24h */}
      <div style={{
        color:      c24 >= 0 ? 'var(--green)' : 'var(--red)',
        fontFamily: 'var(--ff-mono)', fontWeight: 600,
        fontSize: 13, textAlign: 'right',
      }}>
        {c24 >= 0 ? '+' : ''}{c24.toFixed(2)}%
      </div>

      {/* 7d */}
      <div style={{
        color:      c7d >= 0 ? 'var(--green)' : 'var(--red)',
        fontFamily: 'var(--ff-mono)', fontWeight: 600,
        fontSize: 13, textAlign: 'right',
      }}>
        {c7d >= 0 ? '+' : ''}{c7d.toFixed(2)}%
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick, color = 'var(--blue)', small }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: small ? '3px 10px' : '5px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? color : 'var(--border)'}`,
        background: active ? `${color}18` : hovered ? 'var(--bg-hover)' : 'transparent',
        color: active ? color : 'var(--text3)',
        fontSize: small ? 11 : 12,
        fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 36px 1fr 100px 110px 80px 80px',
      gap: 12, padding: '11px 16px', alignItems: 'center',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      {[20, 36, 140, 70, 80, 50, 50].map((w, i) => (
        <div key={i} style={{
          width: w, height: i === 1 ? 36 : 14,
          borderRadius: i === 1 ? '50%' : 4,
          background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          marginLeft: i >= 4 ? 'auto' : 0,
        }} />
      ))}
    </div>
  )
}