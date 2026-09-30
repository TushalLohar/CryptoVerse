import { useState, useEffect } from 'react'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Link2, RefreshCw }    from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

// --- Helper Functions (Logic remains identical) ---
function generateOnChainData() {
  const btcHashRate    = 550 + Math.random() * 50
  const btcActiveAddr  = 800_000 + Math.random() * 200_000
  const btcTxCount     = 300_000 + Math.random() * 50_000
  const btcMempoolSize = 50 + Math.random() * 200
  const btcMempoolTx   = 10_000 + Math.random() * 40_000
  const btcFeeRate     = 10 + Math.random() * 40
  const btcDifficulty  = 83.1 + Math.random() * 5

  const ethActiveAddr  = 400_000 + Math.random() * 100_000
  const ethTxCount     = 1_000_000 + Math.random() * 200_000
  const ethGasUsed     = 15 + Math.random() * 5
  const ethBurnedEth   = 3.5 + Math.random() * 2
  const ethStaked      = 34_000_000 + Math.random() * 1_000_000
  const ethValidators  = 1_050_000 + Math.random() * 50_000

  const btcHistory = Array.from({ length: 30 }, (_, i) => ({
    day: `D-${30 - i}`,
    hashRate: 530 + Math.random() * 60,
    txCount: 280_000 + Math.random() * 80_000,
    activeAddr: 750_000 + Math.random() * 300_000,
  }))

  const ethHistory = Array.from({ length: 30 }, (_, i) => ({
    day: `D-${30 - i}`,
    txCount: 900_000 + Math.random() * 400_000,
    gasUsed: 12 + Math.random() * 8,
    burnedEth: 2 + Math.random() * 4,
  }))

  return {
    btc: { hashRate: btcHashRate, activeAddr: btcActiveAddr, txCount: btcTxCount,
           mempoolSize: btcMempoolSize, mempoolTx: btcMempoolTx, feeRate: btcFeeRate,
           difficulty: btcDifficulty, history: btcHistory },
    eth: { activeAddr: ethActiveAddr, txCount: ethTxCount, gasUsed: ethGasUsed,
           burnedEth: ethBurnedEth, staked: ethStaked, validators: ethValidators,
           history: ethHistory },
  }
}

function fmtNum(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toFixed(0)
}

const TABS = ['Bitcoin', 'Ethereum']

export default function OnChainPage() {
  usePageTitle('On-Chain')

  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('Bitcoin')
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = () => {
    setTimeout(() => {
      setData(generateOnChainData())
      setLastUpdate(new Date())
      setLoading(false)
    }, 600)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(168,85,247,0.12)] flex items-center justify-center">
            <Link2 size={18} className="text-[var(--purple)]" />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)] leading-tight">
              On-Chain Metrics
            </h1>
            <p className="text-[var(--text3)] text-[13px] mt-0.5">
              Network health, activity, and miner data
              {lastUpdate && ` · updated ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-[var(--border-md)] bg-transparent text-[var(--text2)] text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[10px] p-1 w-fit mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-[7px] rounded-lg border-none text-[13px] font-bold cursor-pointer transition-all duration-150 
              ${tab === t ? 'bg-[var(--bg-hover)] text-[var(--text1)]' : 'bg-transparent text-[var(--text3)] hover:text-[var(--text2)]'}`}
          >
            {t === 'Bitcoin' ? '₿ Bitcoin' : 'Ξ Ethereum'}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <SkeletonGrid />
      ) : tab === 'Bitcoin' ? (
        <BtcMetrics data={data.btc} />
      ) : (
        <EthMetrics data={data.eth} />
      )}
    </div>
  )
}

function BtcMetrics({ data }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Hash Rate" value={`${data.hashRate.toFixed(1)} EH/s`} sub="Network security" color="text-[var(--gold)]" icon="⛏️" />
        <MetricCard label="Active Addresses" value={fmtNum(data.activeAddr)} sub="Last 24 hours" color="text-[var(--blue)]" icon="👥" />
        <MetricCard label="Transactions" value={fmtNum(data.txCount)} sub="Last 24 hours" color="text-[var(--green)]" icon="🔄" />
        <MetricCard label="Difficulty" value={`${data.difficulty.toFixed(1)}T`} sub="Current epoch" color="text-[var(--purple)]" icon="🎯" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard label="Mempool Size" value={`${data.mempoolSize.toFixed(1)} MB`} sub="Unconfirmed txns" color="text-[var(--red)]" icon="📦" />
        <MetricCard label="Mempool Transactions" value={fmtNum(data.mempoolTx)} sub="Waiting to confirm" color="text-[var(--gold)]" icon="⏳" />
        <MetricCard label="Recommended Fee" value={`${data.feeRate.toFixed(0)} sat/vB`} sub="For next block" color="text-[var(--green)]" icon="💸" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Hash Rate (30 days)" data={data.history} dataKey="hashRate" color="var(--gold)" formatter={v => `${v.toFixed(1)} EH/s`} yFormatter={v => `${v.toFixed(0)}`} />
        <ChartCard title="Daily Transactions (30 days)" data={data.history} dataKey="txCount" color="var(--blue)" formatter={v => `${fmtNum(v)} txns`} yFormatter={v => fmtNum(v)} type="bar" />
      </div>
    </div>
  )
}

function EthMetrics({ data }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <MetricCard label="Active Addresses" value={fmtNum(data.activeAddr)} sub="Last 24 hours" color="text-[var(--blue)]" icon="👥" />
        <MetricCard label="Transactions" value={fmtNum(data.txCount)} sub="Last 24 hours" color="text-[var(--green)]" icon="🔄" />
        <MetricCard label="ETH Staked" value={fmtNum(data.staked)} sub="Total staked" color="text-[var(--purple)]" icon="🔒" />
        <MetricCard label="Active Validators" value={fmtNum(data.validators)} sub="Securing network" color="text-[var(--gold)]" icon="✅" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard label="ETH Burned" value={`${data.burnedEth.toFixed(2)} ETH/min`} sub="EIP-1559 burn rate" color="text-[var(--red)]" icon="🔥" large />
        <MetricCard label="Avg Gas Used" value={`${data.gasUsed.toFixed(1)} Gwei`} sub="Network congestion" color="text-[var(--gold)]" icon="⛽" large />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="ETH Burned Per Day (30 days)" data={data.history} dataKey="burnedEth" color="var(--red)" formatter={v => `${v.toFixed(2)} ETH/min`} yFormatter={v => v.toFixed(1)} />
        <ChartCard title="Daily Transactions (30 days)" data={data.history} dataKey="txCount" color="var(--purple)" formatter={v => `${fmtNum(v)} txns`} yFormatter={v => fmtNum(v)} type="bar" />
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon, large }) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[16px_20px]">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[var(--text3)] text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`${color} ${large ? 'text-[22px]' : 'text-xl'} font-extrabold font-[var(--ff-mono)] leading-none`}>
        {value}
      </div>
      <div className="text-[var(--text4)] text-[11px] mt-1.5 font-medium italic">
        {sub}
      </div>
    </div>
  )
}

function ChartCard({ title, data, dataKey, color, formatter, yFormatter, type = 'area' }) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[16px_20px]">
      <div className="text-[var(--text2)] text-[13px] font-semibold mb-4">{title}</div>
      <ResponsiveContainer width="100%" height={160}>
        {type === 'area' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} tickFormatter={yFormatter} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
              formatter={v => [formatter(v), title]}
              labelStyle={{ color: 'var(--text3)' }}
              itemStyle={{ color }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={false} animationDuration={400} />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} tickFormatter={yFormatter} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
              formatter={v => [formatter(v), title]}
              labelStyle={{ color: 'var(--text3)' }}
              itemStyle={{ color }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} animationDuration={400} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[100px] rounded-xl bg-gradient-to-r from-[var(--bg-hover)] via-[var(--bg-elevated)] to-[var(--bg-hover)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-[220px] rounded-xl bg-gradient-to-r from-[var(--bg-hover)] via-[var(--bg-elevated)] to-[var(--bg-hover)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
        ))}
      </div>
    </div>
  )
}