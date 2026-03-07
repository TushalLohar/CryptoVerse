import { useState, useEffect, useRef } from 'react'
import { usePageTitle }                from '../hooks/usePageTitle'
import { Zap, RefreshCw, TrendingUp }  from 'lucide-react'

// Binance WebSocket prices for reference
// We simulate other exchange prices with realistic spreads
const PAIRS = [
  { id: 'bitcoin',  symbol: 'BTC', binance: 'btcusdt',  color: '#f7931a' },
  { id: 'ethereum', symbol: 'ETH', binance: 'ethusdt',  color: '#627eea' },
  { id: 'solana',   symbol: 'SOL', binance: 'solusdt',  color: '#9945ff' },
  { id: 'bnb',      symbol: 'BNB', binance: 'bnbusdt',  color: '#f3ba2f' },
  { id: 'xrp',      symbol: 'XRP', binance: 'xrpusdt',  color: '#346aa9' },
  { id: 'dogecoin', symbol: 'DOGE',binance: 'dogeusdt', color: '#c2a633' },
  { id: 'cardano',  symbol: 'ADA', binance: 'adausdt',  color: '#0033ad' },
  { id: 'avalanche',symbol: 'AVAX',binance: 'avaxusdt', color: '#e84142' },
]

const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit', 'KuCoin', 'Gate.io']

// Each exchange has a slight spread offset vs Binance
const EXCHANGE_SPREADS = {
  Binance:  { min: -0.001, max:  0.001 },
  Coinbase: { min: -0.003, max:  0.005 },
  Kraken:   { min: -0.004, max:  0.004 },
  OKX:      { min: -0.002, max:  0.003 },
  Bybit:    { min: -0.002, max:  0.002 },
  KuCoin:   { min: -0.005, max:  0.006 },
  'Gate.io':{ min: -0.004, max:  0.007 },
}

function generateExchangePrices(basePrice) {
  const prices = {}
  EXCHANGES.forEach(ex => {
    const { min, max } = EXCHANGE_SPREADS[ex]
    const spread = min + Math.random() * (max - min)
    prices[ex] = basePrice * (1 + spread)
  })
  return prices
}

function fmtPrice(p) {
  if (!p) return '—'
  if (p >= 10000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  if (p >= 100)   return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  if (p >= 1)     return `$${p.toFixed(4)}`
  return `$${p.toFixed(6)}`
}

function fmtPct(pct) {
  if (pct == null) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(3)}%`
}

// Profitability after fees
// Typical exchange fee: 0.1% maker, 0.1% taker = 0.2% round trip
const ROUND_TRIP_FEE = 0.002

export default function ArbitrageScanner() {
  usePageTitle('Arbitrage Scanner')

  const [livePrices,    setLivePrices]    = useState({}) // { symbol: binancePrice }
  const [exchangePrices,setExchangePrices]= useState({}) // { symbol: { Exchange: price } }
  const [connected,     setConnected]     = useState(false)
  const [minSpread,     setMinSpread]     = useState(0.1)  // % filter
  const [sortBy,        setSortBy]        = useState('spread')
  const [lastUpdate,    setLastUpdate]    = useState(null)
  const wsRef = useRef(null)

  // Connect to Binance WebSocket for live base prices
  useEffect(() => {
    const streams = PAIRS.map(p => `${p.binance}@miniTicker`).join('/')
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (e) => {
      const { data } = JSON.parse(e.data)
      const price    = parseFloat(data.c)
      const symbol   = PAIRS.find(p => `${p.binance}@miniTicker` === data.s?.toLowerCase()
        .replace('@miniticker', '@miniTicker'))?.symbol
        || PAIRS.find(p => p.binance === data.s?.toLowerCase().replace('@miniticker', ''))?.symbol

      if (!symbol || !price) return

      setLivePrices(prev => ({ ...prev, [symbol]: price }))

      // Generate simulated exchange prices around live Binance price
      setExchangePrices(prev => ({
        ...prev,
        [symbol]: generateExchangePrices(price),
      }))

      setLastUpdate(new Date())
    }

    return () => ws.close()
  }, [])

  // Recalculate simulated exchange prices every 3s even without WS update
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices(prev => {
        Object.entries(prev).forEach(([symbol, price]) => {
          setExchangePrices(ep => ({
            ...ep,
            [symbol]: generateExchangePrices(price),
          }))
        })
        return prev
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Build arbitrage opportunities
  const opportunities = PAIRS
    .filter(p => livePrices[p.symbol] && exchangePrices[p.symbol])
    .map(pair => {
      const prices   = exchangePrices[pair.symbol]
      const entries  = Object.entries(prices).sort((a, b) => a[1] - b[1])
      const cheapest = entries[0]    // [exchange, price]
      const priciest = entries[entries.length - 1]

      const spreadPct = ((priciest[1] - cheapest[1]) / cheapest[1]) * 100
      const profitPct = spreadPct - (ROUND_TRIP_FEE * 100)
      const isProfitable = profitPct > 0

      return {
        ...pair,
        basePrice:   livePrices[pair.symbol],
        prices,
        buyAt:       { exchange: cheapest[0],  price: cheapest[1]  },
        sellAt:      { exchange: priciest[0],  price: priciest[1]  },
        spreadPct,
        profitPct,
        isProfitable,
        allPrices:   entries, // sorted cheapest to most expensive
      }
    })
    .filter(o => o.spreadPct >= minSpread)
    .sort((a, b) => {
      if (sortBy === 'spread')  return b.spreadPct - a.spreadPct
      if (sortBy === 'profit')  return b.profitPct - a.profitPct
      if (sortBy === 'symbol')  return a.symbol.localeCompare(b.symbol)
      return 0
    })

  const profitableCount = opportunities.filter(o => o.isProfitable).length

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="var(--green)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Arbitrage Scanner
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Price differences across exchanges · live Binance prices
              {lastUpdate && ` · ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--red)',
              boxShadow:  connected ? '0 0 6px var(--green)' : 'none',
            }} />
            <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Pairs Scanned',      value: PAIRS.length,      color: 'var(--text1)'  },
          { label: 'Exchanges',          value: EXCHANGES.length,  color: 'var(--blue)'   },
          { label: 'Opportunities Found',value: opportunities.length, color: 'var(--gold)' },
          { label: 'Profitable (after fees)', value: profitableCount, color: profitableCount > 0 ? 'var(--green)' : 'var(--text3)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 18px',
          }}>
            <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 6 }}>{label}</div>
            <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: 'var(--ff-mono)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 16, alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Min spread filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
            Min Spread:
          </span>
          {[0, 0.1, 0.2, 0.5].map(v => (
            <button
              key={v}
              onClick={() => setMinSpread(v)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: `1px solid ${minSpread === v ? 'var(--blue)' : 'var(--border)'}`,
                background: minSpread === v ? 'rgba(61,142,248,0.10)' : 'transparent',
                color: minSpread === v ? 'var(--blue)' : 'var(--text3)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {v}%
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>Sort:</span>
          {[
            { key: 'spread', label: 'Spread' },
            { key: 'profit', label: 'Profit' },
            { key: 'symbol', label: 'Symbol' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: '5px 10px', borderRadius: 7,
                border: `1px solid ${sortBy === key ? 'var(--blue)' : 'var(--border)'}`,
                background: sortBy === key ? 'rgba(61,142,248,0.10)' : 'transparent',
                color: sortBy === key ? 'var(--blue)' : 'var(--text3)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '10px 16px', borderRadius: 10, marginBottom: 16,
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        color: 'var(--text3)', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        ⚠️ Exchange prices are simulated around live Binance data.
        Real arbitrage requires exchange accounts, fast execution, and accounts for withdrawal fees and slippage.
        Round-trip fee assumed: 0.2%.
      </div>

      {/* Opportunities */}
      {!connected && opportunities.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, color: 'var(--text3)', fontSize: 14,
        }}>
          Connecting to live prices...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {opportunities.map(opp => (
            <OpportunityCard key={opp.symbol} opp={opp} />
          ))}
          {opportunities.length === 0 && (
            <div style={{
              padding: 48, textAlign: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 14, color: 'var(--text3)', fontSize: 14,
            }}>
              No opportunities above {minSpread}% spread. Try lowering the minimum.
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ── Opportunity card ──
function OpportunityCard({ opp }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       `1px solid ${opp.isProfitable ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
      borderRadius: 14,
      overflow:     'hidden',
      transition:   'border-color 0.2s',
    }}>

      {/* Main row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'grid',
          gridTemplateColumns: '44px 80px 1fr 1fr 110px 110px 32px',
          gap: 14, padding: '14px 18px', alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Coin dot */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: opp.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {opp.symbol}
        </div>

        {/* Symbol + price */}
        <div>
          <div style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 14 }}>
            {opp.symbol}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 11,
            fontFamily: 'var(--ff-mono)', marginTop: 2 }}>
            {fmtPrice(opp.basePrice)}
          </div>
        </div>

        {/* Buy at */}
        <div>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 3 }}>Buy at</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExchangeBadge name={opp.buyAt.exchange} color="var(--green)" />
            <span style={{ color: 'var(--green)', fontFamily: 'var(--ff-mono)',
              fontSize: 13, fontWeight: 700 }}>
              {fmtPrice(opp.buyAt.price)}
            </span>
          </div>
        </div>

        {/* Sell at */}
        <div>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 3 }}>Sell at</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExchangeBadge name={opp.sellAt.exchange} color="var(--red)" />
            <span style={{ color: 'var(--red)', fontFamily: 'var(--ff-mono)',
              fontSize: 13, fontWeight: 700 }}>
              {fmtPrice(opp.sellAt.price)}
            </span>
          </div>
        </div>

        {/* Spread */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 3 }}>Spread</div>
          <div style={{
            color: 'var(--gold)', fontFamily: 'var(--ff-mono)',
            fontSize: 15, fontWeight: 800,
          }}>
            {fmtPct(opp.spreadPct)}
          </div>
        </div>

        {/* Profit after fees */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 3 }}>
            After 0.2% fees
          </div>
          <div style={{
            color: opp.isProfitable ? 'var(--green)' : 'var(--red)',
            fontFamily: 'var(--ff-mono)', fontSize: 15, fontWeight: 800,
          }}>
            {fmtPct(opp.profitPct)}
          </div>
        </div>

        {/* Expand arrow */}
        <div style={{
          color: 'var(--text4)', fontSize: 16,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ↓
        </div>
      </div>

      {/* Expanded — all exchange prices */}
      {expanded && (
        <div style={{
          padding: '0 18px 16px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600,
            padding: '12px 0 8px' }}>
            All Exchange Prices
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}>
            {opp.allPrices.map(([exchange, price], i) => {
              const diffPct = ((price - opp.buyAt.price) / opp.buyAt.price) * 100
              const isCheapest = i === 0
              const isPriciest = i === opp.allPrices.length - 1
              return (
                <div
                  key={exchange}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: isCheapest ? 'rgba(34,197,94,0.08)'
                              : isPriciest ? 'rgba(244,63,94,0.08)'
                              : 'var(--bg-base)',
                    border: `1px solid ${
                      isCheapest ? 'rgba(34,197,94,0.2)'
                    : isPriciest ? 'rgba(244,63,94,0.2)'
                    : 'var(--border)'}`,
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 4,
                  }}>
                    <span style={{ color: 'var(--text2)', fontSize: 11, fontWeight: 600 }}>
                      {exchange}
                    </span>
                    {isCheapest && (
                      <span style={{ color: 'var(--green)', fontSize: 9, fontWeight: 700 }}>
                        CHEAPEST
                      </span>
                    )}
                    {isPriciest && (
                      <span style={{ color: 'var(--red)', fontSize: 9, fontWeight: 700 }}>
                        PRICIEST
                      </span>
                    )}
                  </div>
                  <div style={{
                    color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {fmtPrice(price)}
                  </div>
                  <div style={{
                    color: diffPct === 0 ? 'var(--text4)'
                         : diffPct > 0 ? 'var(--red)' : 'var(--green)',
                    fontFamily: 'var(--ff-mono)', fontSize: 11, marginTop: 3,
                  }}>
                    {diffPct === 0 ? 'base' : fmtPct(diffPct)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Profit calculator */}
          <ProfitCalc opp={opp} />
        </div>
      )}
    </div>
  )
}

// ── Profit calculator inside expanded card ──
function ProfitCalc({ opp }) {
  const [amount, setAmount] = useState('1000')
  const amountNum    = parseFloat(amount) || 0
  const grossProfit  = amountNum * (opp.spreadPct / 100)
  const fees         = amountNum * ROUND_TRIP_FEE
  const netProfit    = grossProfit - fees
  const isProfit     = netProfit > 0

  return (
    <div style={{
      marginTop: 12, padding: '14px 16px',
      background: 'var(--bg-base)', borderRadius: 10,
      border: '1px solid var(--border)',
    }}>
      <div style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
        💰 Profit Calculator
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>Trade amount:</span>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 12,
            }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                width: 100, padding: '6px 8px 6px 20px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-md)',
                borderRadius: 7, color: 'var(--text1)',
                fontSize: 12, outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--text4)', fontSize: 10 }}>Gross Profit</div>
            <div style={{ color: 'var(--text1)', fontFamily: 'var(--ff-mono)',
              fontSize: 13, fontWeight: 700 }}>
              ${grossProfit.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text4)', fontSize: 10 }}>Fees (0.2%)</div>
            <div style={{ color: 'var(--red)', fontFamily: 'var(--ff-mono)',
              fontSize: 13, fontWeight: 700 }}>
              -${fees.toFixed(2)}
            </div>
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 8,
            background: isProfit ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
            border: `1px solid ${isProfit ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
          }}>
            <div style={{ color: 'var(--text4)', fontSize: 10 }}>Net Profit</div>
            <div style={{
              color: isProfit ? 'var(--green)' : 'var(--red)',
              fontFamily: 'var(--ff-mono)', fontSize: 15, fontWeight: 800,
            }}>
              {isProfit ? '+' : '-'}${Math.abs(netProfit).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExchangeBadge({ name, color }) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 5,
      background: `${color}18`,
      color, fontSize: 10, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}