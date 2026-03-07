import { useState, useEffect } from 'react'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Link2, RefreshCw }    from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

// ── Simulated on-chain data ──
// Real on-chain data requires Glassnode/IntoTheBlock (paid APIs)
// We simulate realistic metrics based on actual BTC/ETH ranges

function generateOnChainData() {
  const now = Date.now()

  // BTC metrics
  const btcHashRate    = 550 + Math.random() * 50       // EH/s
  const btcActiveAddr  = 800_000 + Math.random() * 200_000
  const btcTxCount     = 300_000 + Math.random() * 50_000
  const btcMempoolSize = 50 + Math.random() * 200        // MB
  const btcMempoolTx   = 10_000 + Math.random() * 40_000
  const btcFeeRate     = 10 + Math.random() * 40         // sat/vB
  const btcDifficulty  = 83.1 + Math.random() * 5        // T

  // ETH metrics
  const ethActiveAddr  = 400_000 + Math.random() * 100_000
  const ethTxCount     = 1_000_000 + Math.random() * 200_000
  const ethGasUsed     = 15 + Math.random() * 5          // Gwei
  const ethBurnedEth   = 3.5 + Math.random() * 2         // ETH/min
  const ethStaked      = 34_000_000 + Math.random() * 1_000_000
  const ethValidators  = 1_050_000 + Math.random() * 50_000

  // Generate 30-day history
  const btcHistory = Array.from({ length: 30 }, (_, i) => ({
    day:      `D-${30 - i}`,
    hashRate: 530 + Math.random() * 60,
    txCount:  280_000 + Math.random() * 80_000,
    activeAddr: 750_000 + Math.random() * 300_000,
  }))

  const ethHistory = Array.from({ length: 30 }, (_, i) => ({
    day:        `D-${30 - i}`,
    txCount:    900_000 + Math.random() * 400_000,
    gasUsed:    12 + Math.random() * 8,
    burnedEth:  2 + Math.random() * 4,
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

  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('Bitcoin')
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = () => {
    setLoading(true)
    // Simulate async fetch
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
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(168,85,247,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link2 size={18} color="var(--purple)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              On-Chain Metrics
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Network health, activity, and miner data
              {lastUpdate && ` · updated ${lastUpdate.toLocaleTimeString()}`}
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

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: 4,
        width: 'fit-content', marginBottom: 20,
      }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 20px', borderRadius: 7, border: 'none',
              background: tab === t ? 'var(--bg-hover)' : 'transparent',
              color:      tab === t ? 'var(--text1)' : 'var(--text3)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
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

// ── Bitcoin metrics ──
function BtcMetrics({ data }) {
  return (
    <div>
      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        <MetricCard
          label="Hash Rate"
          value={`${data.hashRate.toFixed(1)} EH/s`}
          sub="Network security"
          color="var(--gold)"
          icon="⛏️"
        />
        <MetricCard
          label="Active Addresses"
          value={fmtNum(data.activeAddr)}
          sub="Last 24 hours"
          color="var(--blue)"
          icon="👥"
        />
        <MetricCard
          label="Transactions"
          value={fmtNum(data.txCount)}
          sub="Last 24 hours"
          color="var(--green)"
          icon="🔄"
        />
        <MetricCard
          label="Difficulty"
          value={`${data.difficulty.toFixed(1)}T`}
          sub="Current epoch"
          color="var(--purple)"
          icon="🎯"
        />
      </div>

      {/* Mempool cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        <MetricCard
          label="Mempool Size"
          value={`${data.mempoolSize.toFixed(1)} MB`}
          sub="Unconfirmed txns"
          color="var(--red)"
          icon="📦"
        />
        <MetricCard
          label="Mempool Transactions"
          value={fmtNum(data.mempoolTx)}
          sub="Waiting to confirm"
          color="var(--gold)"
          icon="⏳"
        />
        <MetricCard
          label="Recommended Fee"
          value={`${data.feeRate.toFixed(0)} sat/vB`}
          sub="For next block"
          color="var(--green)"
          icon="💸"
        />
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        <ChartCard
          title="Hash Rate (30 days)"
          data={data.history}
          dataKey="hashRate"
          color="var(--gold)"
          formatter={v => `${v.toFixed(1)} EH/s`}
          yFormatter={v => `${v.toFixed(0)}`}
        />
        <ChartCard
          title="Daily Transactions (30 days)"
          data={data.history}
          dataKey="txCount"
          color="var(--blue)"
          formatter={v => `${fmtNum(v)} txns`}
          yFormatter={v => fmtNum(v)}
          type="bar"
        />
      </div>
    </div>
  )
}

// ── Ethereum metrics ──
function EthMetrics({ data }) {
  return (
    <div>
      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        <MetricCard
          label="Active Addresses"
          value={fmtNum(data.activeAddr)}
          sub="Last 24 hours"
          color="var(--blue)"
          icon="👥"
        />
        <MetricCard
          label="Transactions"
          value={fmtNum(data.txCount)}
          sub="Last 24 hours"
          color="var(--green)"
          icon="🔄"
        />
        <MetricCard
          label="ETH Staked"
          value={fmtNum(data.staked)}
          sub="Total staked"
          color="var(--purple)"
          icon="🔒"
        />
        <MetricCard
          label="Active Validators"
          value={fmtNum(data.validators)}
          sub="Securing network"
          color="var(--gold)"
          icon="✅"
        />
      </div>

      {/* Burn + gas */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        <MetricCard
          label="ETH Burned"
          value={`${data.burnedEth.toFixed(2)} ETH/min`}
          sub="EIP-1559 burn rate"
          color="var(--red)"
          icon="🔥"
          large
        />
        <MetricCard
          label="Avg Gas Used"
          value={`${data.gasUsed.toFixed(1)} Gwei`}
          sub="Network congestion"
          color="var(--gold)"
          icon="⛽"
          large
        />
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        <ChartCard
          title="ETH Burned Per Day (30 days)"
          data={data.history}
          dataKey="burnedEth"
          color="var(--red)"
          formatter={v => `${v.toFixed(2)} ETH/min`}
          yFormatter={v => v.toFixed(1)}
        />
        <ChartCard
          title="Daily Transactions (30 days)"
          data={data.history}
          dataKey="txCount"
          color="var(--purple)"
          formatter={v => `${fmtNum(v)} txns`}
          yFormatter={v => fmtNum(v)}
          type="bar"
        />
      </div>
    </div>
  )
}

// ── Metric card ──
function MetricCard({ label, value, sub, color, icon, large }) {
  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       '1px solid var(--border)',
      borderRadius: 14,
      padding:      '16px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>{label}</span>
      </div>
      <div style={{
        color,
        fontSize:   large ? 22 : 20,
        fontWeight: 800,
        fontFamily: 'var(--ff-mono)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ color: 'var(--text4)', fontSize: 11, marginTop: 6 }}>
        {sub}
      </div>
    </div>
  )
}

// ── Chart card ──
function ChartCard({ title, data, dataKey, color, formatter, yFormatter, type = 'area' }) {
  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       '1px solid var(--border)',
      borderRadius: 14,
      padding:      '16px 20px',
    }}>
      <div style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        {type === 'area' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }}
              tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }}
              tickLine={false} axisLine={false} width={40}
              tickFormatter={yFormatter} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)',
                border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
              formatter={v => [formatter(v), title]}
              labelStyle={{ color: 'var(--text3)' }}
              itemStyle={{ color }}
            />
            <Area type="monotone" dataKey={dataKey}
              stroke={color} strokeWidth={2}
              fill={`url(#grad-${dataKey})`}
              dot={false} animationDuration={400} />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey="day" tick={{ fill: 'var(--text4)', fontSize: 9 }}
              tickLine={false} axisLine={false} interval={9} />
            <YAxis tick={{ fill: 'var(--text4)', fontSize: 9 }}
              tickLine={false} axisLine={false} width={40}
              tickFormatter={yFormatter} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)',
                border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 11 }}
              formatter={v => [formatter(v), title]}
              labelStyle={{ color: 'var(--text3)' }}
              itemStyle={{ color }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]}
              animationDuration={400} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

// ── Skeleton ──
function SkeletonGrid() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            height: 100, borderRadius: 14,
            background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} style={{
            height: 220, borderRadius: 14,
            background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        ))}
      </div>
    </div>
  )
}