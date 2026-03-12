import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Landmark, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// --- Helper Functions (Exactly as provided) ---
async function fetchDefiProtocols() {
  try {
    const res = await fetch('/api/coingecko/defi')
    if (!res.ok) throw new Error('failed')
    return await res.json()
  } catch { return null }
}

async function fetchGlobalDefi() {
  try {
    const res = await fetch('/api/coingecko/global/decentralized_finance_defi')
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return data?.data || null
  } catch { return null }
}

function fmtTvl(n) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

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
    const [defiData, global] = await Promise.all([fetchDefiProtocols(), fetchGlobalDefi()])
    const simData = simulateDefiData()
    setProtocols(simData)
    if (global) setGlobalData(global)
    else {
      setGlobalData({
        defi_market_cap: '86000000000',
        trading_volume_24h: '5200000000',
        defi_dominance: '4.2',
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
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(34,197,94,0.12)] flex items-center justify-center">
            <Landmark size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">DeFi</h1>
            <p className="text-[var(--text3)] text-[13px] mt-[2px]">Decentralized finance protocols ranked by TVL</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 p-[7px_14px] rounded-lg border border-[var(--border-md)] bg-transparent text-[var(--text2)] text-xs font-semibold cursor-pointer">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Global stats */}
      {globalData && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total TVL',       value: fmtTvl(totalTvl),                          color: 'var(--green)'  },
            { label: 'DeFi Market Cap', value: fmtTvl(+globalData.defi_market_cap),        color: 'var(--blue)'   },
            { label: '24h Volume',      value: fmtTvl(+globalData.trading_volume_24h),     color: 'var(--purple)' },
            { label: 'DeFi Dominance',  value: `${(+globalData.defi_dominance).toFixed(2)}%`, color: 'var(--gold)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[14px_18px]">
              <div className="text-[var(--text3)] text-[11px] mb-1.5">{label}</div>
              <div style={{ color }} className="text-xl font-extrabold font-[var(--ff-mono)]">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Category + chain filters */}
      <div className="flex flex-col gap-2 mb-[14px]">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CHAINS.map(c => (
            <FilterChip key={c} label={c} active={chain === c} onClick={() => setChain(c)} color="var(--purple)" small />
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_36px_1fr_100px_110px_80px_80px] gap-3 p-[0_16px_8px]">
        {[
          { label: '#',       align: 'text-left'  },
          { label: '',        align: 'text-left'  },
          { label: 'Protocol',align: 'text-left'  },
          { label: 'Category',align: 'text-left'  },
          { label: 'TVL',     align: 'text-right', key: 'tvl'       },
          { label: '24h %',   align: 'text-right', key: 'change24h' },
          { label: '7d %',    align: 'text-right', key: 'change7d'  },
        ].map(({ label, align, key }, i) => (
          <span
            key={i}
            onClick={key ? () => handleSort(key) : undefined}
            className={`text-[11px] font-semibold ${align} ${key ? 'cursor-pointer' : 'cursor-default'} ${key && sortKey === key ? 'text-[var(--blue)]' : 'text-[var(--text3)]'}`}
          >
            {label}{key && sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </span>
        ))}
      </div>

      {/* Protocol rows */}
      <div className="flex flex-col gap-1">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
          : filtered.map((protocol, i) => (
            <ProtocolRow
              key={protocol.id}
              protocol={protocol}
              rank={i + 1}
              totalTvl={totalTvl}
              isSelected={selected?.id === protocol.id}
              onSelect={() => setSelected(selected?.id === protocol.id ? null : protocol)}
            />
          ))
        }
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="mt-4 bg-[var(--bg-elevated)] border border-[var(--border-md)] rounded-[14px] p-5 animate-[fadeUp_0.2s_ease-out_both]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[22px]">🏦</span>
              <div>
                <div className="text-[var(--text1)] font-bold text-base">{selected.name}</div>
                <div className="text-[var(--text3)] text-xs mt-[2px]">{selected.category} · {selected.chain}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="bg-none border-none text-[var(--text3)] cursor-pointer text-[18px]">×</button>
          </div>

          <div className="grid grid-cols-[1fr_3fr] gap-5">
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'TVL',      value: fmtTvl(selected.tvl),                         color: 'var(--text1)'  },
                { label: '24h',      value: `${selected.change24h >= 0 ? '+' : ''}${selected.change24h.toFixed(2)}%`,
                                     color: selected.change24h >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: '7d',       value: `${selected.change7d >= 0 ? '+' : ''}${selected.change7d.toFixed(2)}%`,
                                     color: selected.change7d >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Mkt Share',value: `${((selected.tvl / totalTvl) * 100).toFixed(1)}%`,
                                     color: 'var(--blue)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[var(--bg-base)] rounded-[10px] p-[10px_14px] border border-[var(--border)]">
                  <div className="text-[var(--text3)] text-[11px]">{label}</div>
                  <div style={{ color }} className="font-bold text-base font-[var(--ff-mono)] mt-[3px]">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[var(--text3)] text-xs mb-2.5">TVL History (30 days)</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={selected.tvlHistory}>
                  <defs>
                    <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} interval={9} />
                  <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => fmtTvl(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
                    formatter={v => [fmtTvl(v), 'TVL']}
                    labelStyle={{ color: 'var(--text3)' }}
                    itemStyle={{ color: 'var(--green)' }}
                  />
                  <Area type="monotone" dataKey="tvl" stroke="var(--green)" strokeWidth={2} fill="url(#tvlGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
      className={`grid grid-cols-[32px_36px_1fr_100px_110px_80px_80px] gap-3 p-[11px_16px] items-center rounded-xl cursor-pointer transition-all duration-150 border
        ${isSelected ? 'bg-[rgba(34,197,94,0.05)] border-[rgba(34,197,94,0.3)]' : 
          hovered ? 'bg-[var(--bg-hover)] border-[var(--border-md)]' : 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}
    >
      <span className="text-[var(--text4)] text-[11px] font-[var(--ff-mono)]">{rank}</span>
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
        style={{ background: `hsl(${rank * 37 % 360}, 60%, 40%)` }}
      >
        {protocol.name[0]}
      </div>
      <div>
        <div className="text-[var(--text1)] font-semibold text-[13px]">{protocol.name}</div>
        <div className="mt-1 h-[3px] rounded-[2px] bg-[var(--border)] w-[120px] overflow-hidden">
          <div className="h-full rounded-[2px] bg-[var(--green)] transition-all duration-300" style={{ width: `${Math.min(share * 3, 100)}%` }} />
        </div>
      </div>
      <div className="p-[3px_8px] rounded-full bg-[var(--bg-hover)] text-[var(--text3)] text-[10px] font-semibold whitespace-nowrap w-fit">
        {protocol.category}
      </div>
      <div className="text-[var(--text1)] font-[var(--ff-mono)] font-bold text-sm text-right">{fmtTvl(protocol.tvl)}</div>
      <div className={`font-[var(--ff-mono)] font-semibold text-[13px] text-right ${c24 >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{c24 >= 0 ? '+' : ''}{c24.toFixed(2)}%</div>
      <div className={`font-[var(--ff-mono)] font-semibold text-[13px] text-right ${c7d >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{c7d >= 0 ? '+' : ''}{c7d.toFixed(2)}%</div>
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
      className={`rounded-full border transition-all duration-150 cursor-pointer font-semibold whitespace-nowrap
        ${small ? 'p-[3px_10px] text-[11px]' : 'p-[5px_12px] text-xs'}`}
      style={{
        borderColor: active ? color : 'var(--border)',
        background: active ? `${color}18` : hovered ? 'var(--bg-hover)' : 'transparent',
        color: active ? color : 'var(--text3)',
      }}
    >
      {label}
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[32px_36px_1fr_100px_110px_80px_80px] gap-3 p-[11px_16px] items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
      {[20, 36, 140, 70, 80, 50, 50].map((w, i) => (
        <div key={i} className={`h-3.5 bg-gradient-to-r from-[var(--bg-hover)] via-[var(--bg-elevated)] to-[var(--bg-hover)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite] ${i === 1 ? 'w-9 h-9 rounded-full' : 'rounded-[4px]'} ${i >= 4 ? 'ml-auto' : ''}`} style={{ width: i === 1 ? 36 : w }} />
      ))}
    </div>
  )
}