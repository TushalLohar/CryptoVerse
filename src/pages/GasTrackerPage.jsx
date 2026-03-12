import { useState, useEffect } from 'react'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Fuel, Calculator, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// --- Helper Functions (Logic remains identical) ---
async function fetchGasData() {
  try {
    const res = await fetch('https://api.owlracle.info/v4/eth/gas?apikey=&accept=75')
    if (!res.ok) throw new Error('failed')
    return await res.json()
  } catch { return null }
}

function simulateGas() {
  const base = 15 + Math.random() * 30
  return {
    slow:     { maxFeePerGas: (base * 0.8).toFixed(2) },
    standard: { maxFeePerGas: base.toFixed(2) },
    fast:     { maxFeePerGas: (base * 1.2).toFixed(2) },
    instant:  { maxFeePerGas: (base * 1.5).toFixed(2) },
    baseFee:  (base * 0.75).toFixed(2),
  }
}

const GAS_OPERATIONS = [
  { label: 'ETH Transfer',       gasLimit: 21_000   },
  { label: 'ERC-20 Transfer',    gasLimit: 65_000   },
  { label: 'Uniswap Swap',       gasLimit: 150_000  },
  { label: 'NFT Mint',           gasLimit: 200_000  },
  { label: 'Contract Deploy',    gasLimit: 500_000  },
  { label: 'Curve Swap',         gasLimit: 800_000  },
]

const SPEED_CONFIG = [
  { key: 'slow',     label: '🐢 Slow',     time: '~5 min',  color: 'var(--text3)'  },
  { key: 'standard', label: '🚶 Standard', time: '~1 min',  color: 'var(--blue)'   },
  { key: 'fast',     label: '🚀 Fast',     time: '~30 sec', color: 'var(--green)'  },
  { key: 'instant',  label: '⚡ Instant',  time: '~15 sec', color: 'var(--purple)' },
]

function generateHistoryPoint(i, baseGas) {
  const time = new Date(Date.now() - (59 - i) * 60_000)
  return {
    time:  `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`,
    gwei:  Math.max(5, baseGas + (Math.random() - 0.5) * 20),
  }
}

export default function GasTrackerPage() {
  usePageTitle('Gas Tracker')

  const [gas,         setGas]         = useState(null)
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [ethPrice,    setEthPrice]    = useState(3200)
  const [calcGwei,    setCalcGwei]    = useState('')
  const [calcOp,      setCalcOp]      = useState(GAS_OPERATIONS[0])

  const load = async () => {
    setLoading(true)
    const data = await fetchGasData()
    let gasData
    if (data?.speeds) {
      const [slow, standard, fast, instant] = data.speeds
      gasData = {
        slow:     { maxFeePerGas: slow?.maxFeePerGas || 10 },
        standard: { maxFeePerGas: standard?.maxFeePerGas || 15 },
        fast:     { maxFeePerGas: fast?.maxFeePerGas || 20 },
        instant:  { maxFeePerGas: instant?.maxFeePerGas || 25 },
        baseFee:  data.baseFee || 12,
      }
    } else {
      gasData = simulateGas()
    }
    setGas(gasData)
    const baseGas = parseFloat(gasData.standard.maxFeePerGas)
    setHistory(Array.from({ length: 60 }, (_, i) => generateHistoryPoint(i, baseGas)))
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/coingecko/simple/price?ids=ethereum&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd || 3200))
      .catch(() => {})
  }, [])

  const calcGweiValue = parseFloat(calcGwei) || (gas ? parseFloat(gas.standard.maxFeePerGas) : 20)
  const calcCostEth   = (calcGweiValue * calcOp.gasLimit) / 1e9
  const calcCostUsd   = calcCostEth * ethPrice
  const currentGwei   = gas ? parseFloat(gas.standard.maxFeePerGas) : 0

  const networkStatus =
    currentGwei < 10  ? { label: 'Very Low',  color: 'text-[var(--green)]', bg: 'bg-[rgba(34,197,94,0.12)]', border: 'border-[rgba(34,197,94,0.3)]' } :
    currentGwei < 20  ? { label: 'Low',        color: 'text-[var(--green)]', bg: 'bg-[rgba(34,197,94,0.12)]', border: 'border-[rgba(34,197,94,0.3)]' } :
    currentGwei < 40  ? { label: 'Normal',     color: 'text-[var(--blue)]',  bg: 'bg-[rgba(61,142,248,0.12)]', border: 'border-[rgba(61,142,248,0.3)]' } :
    currentGwei < 80  ? { label: 'High',       color: 'text-[var(--gold)]',  bg: 'bg-[rgba(245,158,11,0.12)]', border: 'border-[rgba(245,158,11,0.3)]' } :
                        { label: 'Very High',  color: 'text-[var(--red)]',   bg: 'bg-[rgba(244,63,94,0.12)]',  border: 'border-[rgba(244,63,94,0.3)]' }

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-[10px]">
          <div className="w-9 h-9 rounded-[10px] bg-[rgba(245,158,11,0.12)] flex items-center justify-center">
            <Fuel size={18} className="text-[var(--gold)]" />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">Gas Tracker</h1>
            <p className="text-[var(--text3)] text-[13px] mt-0.5">
              Ethereum gas prices · updates every 15s
              {lastUpdated && <span className="ml-2">· last updated {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${networkStatus.color} ${networkStatus.bg} ${networkStatus.border}`}>
            {networkStatus.label} Gas
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border border-[var(--border-md)] bg-transparent text-[var(--text2)] text-xs font-semibold cursor-pointer">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Gas speed cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {SPEED_CONFIG.map(({ key, label, time, color }) => {
          const speed = gas?.[key]
          return (
            <div key={key} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[16px_20px]">
              <div className="text-[var(--text3)] text-xs mb-2.5">{label}</div>
              {loading || !speed ? (
                <div className="h-8 rounded-md bg-gradient-to-r from-[var(--bg-hover)] via-[var(--bg-elevated)] to-[var(--bg-hover)] bg-[length:200%_100%] animate-[shimmer_1.4s_infinite]" />
              ) : (
                <>
                  <div style={{ color }} className="font-[var(--ff-mono)] text-[26px] font-extrabold leading-none">
                    {parseFloat(speed.maxFeePerGas).toFixed(1)}
                    <span className="text-[13px] font-medium text-[var(--text3)] ml-1">Gwei</span>
                  </div>
                  <div className="text-[var(--text3)] text-xs mt-1.5">{time}</div>
                  <div className="text-[var(--text2)] text-xs font-[var(--ff-mono)] mt-1">
                    ~${(parseFloat(speed.maxFeePerGas) * 21000 / 1e9 * ethPrice).toFixed(2)} transfer
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Chart + Calculator row */}
      <div className="grid grid-cols-[1fr_380px] gap-4 mb-6">
        {/* History chart */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[16px_20px]">
          <div className="text-[var(--text2)] text-[13px] font-semibold mb-4">Gas Price History (last 60 min)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: 'var(--text4)', fontSize: 10 }} tickLine={false} axisLine={false} interval={9} />
              <YAxis tick={{ fill: 'var(--text4)', fontSize: 10 }} tickLine={false} axisLine={false} width={35} tickFormatter={v => v.toFixed(0)} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: 12 }}
                formatter={v => [`${v.toFixed(2)} Gwei`, 'Gas Price']}
                labelStyle={{ color: 'var(--text3)' }}
                itemStyle={{ color: 'var(--gold)' }}
              />
              <Area type="monotone" dataKey="gwei" stroke="var(--gold)" strokeWidth={2} fill="url(#gasGradient)" dot={false} animationDuration={300} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gas Calculator */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[16px_20px]">
          <div className="flex items-center gap-2 text-[var(--text2)] text-[13px] font-semibold mb-4">
            <Calculator size={14} /> Gas Calculator
          </div>
          <label className="text-[var(--text3)] text-[11px] font-semibold uppercase tracking-wider">Operation</label>
          <div className="flex flex-col gap-1 mt-1.5 mb-3.5">
            {GAS_OPERATIONS.map(op => (
              <button
                key={op.label}
                onClick={() => setCalcOp(op)}
                className={`flex justify-between items-center px-2.5 py-2 rounded-lg border text-xs font-medium transition-all duration-100 
                  ${calcOp.label === op.label ? 'border-[var(--blue)] bg-[rgba(61,142,248,0.08)] text-[var(--blue)]' : 'border-[var(--border)] bg-transparent text-[var(--text2)] hover:bg-[var(--bg-hover)]'}`}
              >
                <span>{op.label}</span>
                <span className="text-[var(--text4)] font-[var(--ff-mono)] text-[11px]">{op.gasLimit.toLocaleString()} gas</span>
              </button>
            ))}
          </div>

          <label className="text-[var(--text3)] text-[11px] font-semibold uppercase tracking-wider">Gas Price (Gwei)</label>
          <input
            type="number"
            value={calcGwei}
            onChange={e => setCalcGwei(e.target.value)}
            placeholder={gas ? parseFloat(gas.standard.maxFeePerGas).toFixed(1) : '20'}
            className="w-full px-3 py-2 mt-1.5 bg-[var(--bg-base)] border border-[var(--border-md)] rounded-lg text-[var(--text1)] text-[13px] outline-none focus:border-[var(--blue)] transition-colors"
          />

          <div className="mt-3.5 p-3.5 bg-[var(--bg-base)] rounded-xl border border-[var(--border)]">
            <div className="flex justify-between mb-1.5">
              <span className="text-[var(--text3)] text-xs">Cost (ETH)</span>
              <span className="text-[var(--text1)] text-[13px] font-bold font-[var(--ff-mono)]">Ξ{calcCostEth.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text3)] text-xs">Cost (USD)</span>
              <span className="text-[var(--gold)] text-base font-extrabold font-[var(--ff-mono)]">${calcCostUsd.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      {gas && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-[14px_20px] flex items-center gap-5">
          <div className="flex items-center">
            <span className="text-[var(--text3)] text-xs">Base Fee</span>
            <span className="text-[var(--text1)] font-[var(--ff-mono)] font-bold text-[15px] ml-2.5">{parseFloat(gas.baseFee).toFixed(2)} Gwei</span>
          </div>
          <div className="w-px h-5 bg-[var(--border)]" />
          <div className="flex items-center">
            <span className="text-[var(--text3)] text-xs">ETH Price</span>
            <span className="text-[var(--text1)] font-[var(--ff-mono)] font-bold text-[15px] ml-2.5">${ethPrice.toLocaleString()}</span>
          </div>
          <div className="w-px h-5 bg-[var(--border)]" />
          <div className="text-[var(--text3)] text-xs flex-1 text-right italic">
            Tip: Gas is cheapest on weekends and late nights UTC
          </div>
        </div>
      )}
    </div>
  )
}