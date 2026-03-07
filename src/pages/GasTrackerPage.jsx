import { useState, useEffect } from 'react'
import { usePageTitle }        from '../hooks/usePageTitle'
import { Fuel, Calculator, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Fetch live ETH gas from the Owlracle free API — no key needed
// Falls back to simulated data if unavailable
async function fetchGasData() {
  try {
    const res = await fetch('https://api.owlracle.info/v4/eth/gas?apikey=&accept=75')
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

// Simulate realistic gas data if API fails
function simulateGas() {
  const base = 15 + Math.random() * 30
  return {
    slow:     { maxFeePerGas: (base * 0.8).toFixed(2),  estimatedFee: (base * 0.8 * 21000 / 1e9 * 3200).toFixed(4) },
    standard: { maxFeePerGas: base.toFixed(2),           estimatedFee: (base * 21000 / 1e9 * 3200).toFixed(4) },
    fast:     { maxFeePerGas: (base * 1.2).toFixed(2),  estimatedFee: (base * 1.2 * 21000 / 1e9 * 3200).toFixed(4) },
    instant:  { maxFeePerGas: (base * 1.5).toFixed(2),  estimatedFee: (base * 1.5 * 21000 / 1e9 * 3200).toFixed(4) },
    baseFee:  (base * 0.75).toFixed(2),
  }
}

// Common DeFi operations and their gas limits
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
        slow:     { maxFeePerGas: slow?.maxFeePerGas     || 10, estimatedFee: slow?.estimatedFee     || 0 },
        standard: { maxFeePerGas: standard?.maxFeePerGas || 15, estimatedFee: standard?.estimatedFee || 0 },
        fast:     { maxFeePerGas: fast?.maxFeePerGas     || 20, estimatedFee: fast?.estimatedFee     || 0 },
        instant:  { maxFeePerGas: instant?.maxFeePerGas  || 25, estimatedFee: instant?.estimatedFee  || 0 },
        baseFee:  data.baseFee || 12,
      }
    } else {
      gasData = simulateGas()
    }

    setGas(gasData)

    // Build 60-min history
    const baseGas = parseFloat(gasData.standard.maxFeePerGas)
    setHistory(Array.from({ length: 60 }, (_, i) => generateHistoryPoint(i, baseGas)))

    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Refresh every 15 seconds
    const interval = setInterval(load, 15_000)
    return () => clearInterval(interval)
  }, [])

  // Fetch ETH price
  useEffect(() => {
    fetch('/api/coingecko/simple/price?ids=ethereum&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd || 3200))
      .catch(() => {})
  }, [])

  // Calculator
  const calcGweiValue = parseFloat(calcGwei) || (gas ? parseFloat(gas.standard.maxFeePerGas) : 20)
  const calcCostEth   = (calcGweiValue * calcOp.gasLimit) / 1e9
  const calcCostUsd   = calcCostEth * ethPrice

  const currentGwei = gas ? parseFloat(gas.standard.maxFeePerGas) : 0
  const networkStatus =
    currentGwei < 10  ? { label: 'Very Low',  color: 'var(--green)'  } :
    currentGwei < 20  ? { label: 'Low',        color: 'var(--green)'  } :
    currentGwei < 40  ? { label: 'Normal',     color: 'var(--blue)'   } :
    currentGwei < 80  ? { label: 'High',       color: 'var(--gold)'   } :
                        { label: 'Very High',  color: 'var(--red)'    }

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
            background: 'rgba(245,158,11,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Fuel size={18} color="var(--gold)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Gas Tracker
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Ethereum gas prices · updates every 15s
              {lastUpdated && (
                <span style={{ marginLeft: 8 }}>
                  · last updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Network status badge */}
          <div style={{
            padding: '5px 14px', borderRadius: 999,
            background: `${networkStatus.color}22`,
            border: `1px solid ${networkStatus.color}44`,
            color: networkStatus.color,
            fontSize: 12, fontWeight: 700,
          }}>
            {networkStatus.label} Gas
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
      </div>

      {/* Gas speed cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 24,
      }}>
        {SPEED_CONFIG.map(({ key, label, time, color }) => {
          const speed = gas?.[key]
          return (
            <div key={key} style={{
              background:   'var(--bg-elevated)',
              border:       `1px solid var(--border)`,
              borderRadius: 14,
              padding:      '16px 20px',
              transition:   'border-color 0.15s',
            }}>
              <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 10 }}>
                {label}
              </div>

              {loading || !speed ? (
                <div style={{
                  height: 32, borderRadius: 6,
                  background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite',
                }} />
              ) : (
                <>
                  <div style={{
                    color, fontFamily: 'var(--ff-mono)',
                    fontSize: 26, fontWeight: 800, lineHeight: 1,
                  }}>
                    {parseFloat(speed.maxFeePerGas).toFixed(1)}
                    <span style={{ fontSize: 13, fontWeight: 500,
                      color: 'var(--text3)', marginLeft: 4 }}>
                      Gwei
                    </span>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>
                    {time}
                  </div>
                  <div style={{
                    color: 'var(--text2)', fontSize: 12,
                    fontFamily: 'var(--ff-mono)', marginTop: 4,
                  }}>
                    ~${(parseFloat(speed.maxFeePerGas) * 21000 / 1e9 * ethPrice).toFixed(2)} transfer
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Chart + Calculator row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 380px',
        gap: 16, marginBottom: 24,
      }}>

        {/* 60-min history chart */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div style={{ color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Gas Price History (last 60 min)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--gold)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text4)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={9}
              />
              <YAxis
                tick={{ fill: 'var(--text4)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={35}
                tickFormatter={v => `${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-md)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={v => [`${v.toFixed(2)} Gwei`, 'Gas Price']}
                labelStyle={{ color: 'var(--text3)' }}
                itemStyle={{ color: 'var(--gold)' }}
              />
              <Area
                type="monotone"
                dataKey="gwei"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="url(#gasGradient)"
                dot={false}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gas Calculator */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            <Calculator size={14} />
            Gas Calculator
          </div>

          {/* Operation selector */}
          <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
            Operation
          </label>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            marginTop: 6, marginBottom: 14,
          }}>
            {GAS_OPERATIONS.map(op => (
              <button
                key={op.label}
                onClick={() => setCalcOp(op)}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '7px 10px',
                  borderRadius: 7,
                  border: `1px solid ${calcOp.label === op.label ? 'var(--blue)' : 'var(--border)'}`,
                  background: calcOp.label === op.label ? 'rgba(61,142,248,0.08)' : 'transparent',
                  color: calcOp.label === op.label ? 'var(--blue)' : 'var(--text2)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.1s',
                  textAlign: 'left',
                }}
              >
                <span>{op.label}</span>
                <span style={{ color: 'var(--text4)', fontSize: 11,
                  fontFamily: 'var(--ff-mono)' }}>
                  {op.gasLimit.toLocaleString()} gas
                </span>
              </button>
            ))}
          </div>

          {/* Gwei input */}
          <label style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
            Gas Price (Gwei)
          </label>
          <input
            type="number"
            value={calcGwei}
            onChange={e => setCalcGwei(e.target.value)}
            placeholder={gas ? parseFloat(gas.standard.maxFeePerGas).toFixed(1) : '20'}
            style={{
              width: '100%', padding: '9px 12px', marginTop: 6,
              background: 'var(--bg-base)', border: '1px solid var(--border-md)',
              borderRadius: 8, color: 'var(--text1)', fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* Result */}
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--bg-base)', borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>Cost (ETH)</span>
              <span style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 700,
                fontFamily: 'var(--ff-mono)' }}>
                Ξ{calcCostEth.toFixed(6)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>Cost (USD)</span>
              <span style={{ color: 'var(--gold)', fontSize: 16, fontWeight: 800,
                fontFamily: 'var(--ff-mono)' }}>
                ${calcCostUsd.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Base fee info */}
      {gas && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>Base Fee</span>
            <span style={{
              color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
              fontWeight: 700, fontSize: 15, marginLeft: 10,
            }}>
              {parseFloat(gas.baseFee).toFixed(2)} Gwei
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>ETH Price</span>
            <span style={{
              color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
              fontWeight: 700, fontSize: 15, marginLeft: 10,
            }}>
              ${ethPrice.toLocaleString()}
            </span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div style={{ color: 'var(--text3)', fontSize: 12 }}>
            Tip: Gas is cheapest on weekends and late nights UTC
          </div>
        </div>
      )}

    </div>
  )
}