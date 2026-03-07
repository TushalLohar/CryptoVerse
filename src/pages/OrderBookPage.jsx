import { useState, useEffect, useRef } from 'react'
import { usePageTitle }                from '../hooks/usePageTitle'
import { BookOpen, Activity }          from 'lucide-react'

const SYMBOLS = [
  { label: 'BTC/USDT', value: 'btcusdt' },
  { label: 'ETH/USDT', value: 'ethusdt' },
  { label: 'SOL/USDT', value: 'solusdt' },
  { label: 'BNB/USDT', value: 'bnbusdt' },
  { label: 'XRP/USDT', value: 'xrpusdt' },
  { label: 'DOGE/USDT',value: 'dogeusdt'},
]

const DEPTHS = [10, 15, 20]

function fmtPrice(price, symbol) {
  const p = parseFloat(price)
  if (symbol.startsWith('btc')) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1)    return p.toFixed(4)
  return p.toFixed(6)
}

function fmtAmount(amount) {
  const n = parseFloat(amount)
  if (n >= 1000) return `${(n / 1000).toFixed(2)}K`
  return n.toFixed(4)
}

function fmtTotal(price, amount) {
  const total = parseFloat(price) * parseFloat(amount)
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(2)}M`
  if (total >= 1_000)     return `$${(total / 1_000).toFixed(1)}K`
  return `$${total.toFixed(0)}`
}

export default function OrderBookPage() {
  usePageTitle('Order Book')

  const [symbol,   setSymbol]   = useState('btcusdt')
  const [depth,    setDepth]    = useState(15)
  const [asks,     setAsks]     = useState([]) // sorted lowest first
  const [bids,     setBids]     = useState([]) // sorted highest first
  const [spread,   setSpread]   = useState(null)
  const [lastPrice,setLastPrice]= useState(null)
  const [priceDir, setPriceDir] = useState(null) // 'up' | 'down'
  const [trades,   setTrades]   = useState([])   // recent trades
  const [connected,setConnected]= useState(false)

  const wsDepthRef  = useRef(null)
  const wsTradeRef  = useRef(null)
  const prevPriceRef = useRef(null)

  useEffect(() => {
    // Close existing connections
    wsDepthRef.current?.close()
    wsTradeRef.current?.close()
    setAsks([])
    setBids([])
    setTrades([])
    setConnected(false)

    // Order book depth stream
    const wsDepth = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@depth20@100ms`
    )
    wsDepthRef.current = wsDepth

    wsDepth.onopen  = () => setConnected(true)
    wsDepth.onclose = () => setConnected(false)

    wsDepth.onmessage = (e) => {
      const data = JSON.parse(e.data)

      // asks: lowest ask price first
      const newAsks = (data.asks || [])
        .slice(0, depth)
        .map(([price, qty]) => ({ price, qty }))

      // bids: highest bid price first
      const newBids = (data.bids || [])
        .slice(0, depth)
        .map(([price, qty]) => ({ price, qty }))

      setAsks(newAsks)
      setBids(newBids)

      if (newAsks.length && newBids.length) {
        const spreadVal = parseFloat(newAsks[0].price) - parseFloat(newBids[0].price)
        setSpread(spreadVal.toFixed(4))
      }
    }

    // Trade stream for last price + recent trades
    const wsTrade = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@trade`
    )
    wsTradeRef.current = wsTrade

    wsTrade.onmessage = (e) => {
      const trade = JSON.parse(e.data)
      const price = parseFloat(trade.p)

      // Track price direction
      if (prevPriceRef.current !== null) {
        setPriceDir(price > prevPriceRef.current ? 'up' : price < prevPriceRef.current ? 'down' : null)
      }
      prevPriceRef.current = price
      setLastPrice(price)

      // Add to recent trades (keep last 30)
      setTrades(prev => [{
        id:     trade.t,
        price:  trade.p,
        qty:    trade.q,
        isBuy:  !trade.m, // m = maker = sell
        time:   new Date(trade.T),
      }, ...prev].slice(0, 30))
    }

    return () => {
      wsDepth.close()
      wsTrade.close()
    }
  }, [symbol, depth])

  // Max qty for depth bar width calculation
  const maxBidQty = Math.max(...bids.map(b => parseFloat(b.qty)), 1)
  const maxAskQty = Math.max(...asks.map(a => parseFloat(a.qty)), 1)

  // Total bid/ask volume for imbalance indicator
  const totalBidVol = bids.reduce((s, b) => s + parseFloat(b.qty), 0)
  const totalAskVol = asks.reduce((s, a) => s + parseFloat(a.qty), 0)
  const bidPct = totalBidVol / (totalBidVol + totalAskVol) * 100

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
            background: 'rgba(61,142,248,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={18} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Order Book
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Live Binance order book · 100ms updates
            </p>
          </div>
        </div>

        {/* Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--green)' : 'var(--red)',
            boxShadow:  connected ? '0 0 6px var(--green)' : 'none',
          }} />
          <span style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
            {connected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        {/* Symbol selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SYMBOLS.map(s => (
            <button
              key={s.value}
              onClick={() => setSymbol(s.value)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: symbol === s.value ? 'var(--blue)' : 'var(--bg-elevated)',
                color:      symbol === s.value ? '#fff' : 'var(--text3)',
                border:     `1px solid ${symbol === s.value ? 'var(--blue)' : 'var(--border)'}`,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Depth selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DEPTHS.map(d => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: depth === d ? 'var(--bg-hover)' : 'transparent',
                border:     `1px solid ${depth === d ? 'var(--border-md)' : 'var(--border)'}`,
                color:      depth === d ? 'var(--text1)' : 'var(--text3)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {d} levels
            </button>
          ))}
        </div>
      </div>

      {/* Main layout — order book + trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Order book */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>

          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-base)',
          }}>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>
              Price (USDT)
            </span>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600,
              textAlign: 'center' }}>
              Amount ({symbol.replace('usdt', '').toUpperCase()})
            </span>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600,
              textAlign: 'right' }}>
              Total
            </span>
          </div>

          {/* Asks — displayed reversed so lowest ask is closest to spread */}
          <div style={{ padding: '4px 0' }}>
            {[...asks].reverse().map((ask, i) => (
              <OrderRow
                key={`ask-${i}`}
                price={ask.price}
                qty={ask.qty}
                isBid={false}
                maxQty={maxAskQty}
                symbol={symbol}
              />
            ))}
          </div>

          {/* Spread */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '8px 16px',
            background: 'var(--bg-base)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }}>
            {/* Last price */}
            <div style={{
              color:      priceDir === 'up' ? 'var(--green)' : priceDir === 'down' ? 'var(--red)' : 'var(--text1)',
              fontFamily: 'var(--ff-mono)',
              fontWeight: 800,
              fontSize:   20,
              transition: 'color 0.3s',
            }}>
              {lastPrice ? fmtPrice(lastPrice.toString(), symbol) : '—'}
            </div>

            {/* Spread */}
            {spread && (
              <div style={{
                color: 'var(--text3)', fontSize: 11,
                fontFamily: 'var(--ff-mono)',
              }}>
                Spread: {spread}
              </div>
            )}
          </div>

          {/* Bids */}
          <div style={{ padding: '4px 0' }}>
            {bids.map((bid, i) => (
              <OrderRow
                key={`bid-${i}`}
                price={bid.price}
                qty={bid.qty}
                isBid={true}
                maxQty={maxBidQty}
                symbol={symbol}
              />
            ))}
          </div>

          {/* Bid/Ask imbalance bar */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-base)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 5,
            }}>
              <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>
                Bids {bidPct.toFixed(1)}%
              </span>
              <span style={{ color: 'var(--red)', fontSize: 11, fontWeight: 700 }}>
                {(100 - bidPct).toFixed(1)}% Asks
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: 'var(--border)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${bidPct}%`,
                background: 'linear-gradient(to right, var(--green), var(--blue))',
                borderRadius: 3,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>

        {/* Recent trades */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-base)',
          }}>
            <Activity size={13} color="var(--text3)" />
            <span style={{ color: 'var(--text2)', fontSize: 12, fontWeight: 700 }}>
              Recent Trades
            </span>
          </div>

          {/* Trade headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            padding: '6px 14px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600 }}>Price</span>
            <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600,
              textAlign: 'center' }}>Amount</span>
            <span style={{ color: 'var(--text3)', fontSize: 10, fontWeight: 600,
              textAlign: 'right' }}>Time</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {trades.map(trade => (
              <div
                key={trade.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '5px 14px', alignItems: 'center',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  color:      trade.isBuy ? 'var(--green)' : 'var(--red)',
                  fontFamily: 'var(--ff-mono)',
                  fontSize:   11, fontWeight: 700,
                }}>
                  {fmtPrice(trade.price, symbol)}
                </span>
                <span style={{
                  color: 'var(--text2)', fontFamily: 'var(--ff-mono)',
                  fontSize: 11, textAlign: 'center',
                }}>
                  {fmtAmount(trade.qty)}
                </span>
                <span style={{
                  color: 'var(--text4)', fontFamily: 'var(--ff-mono)',
                  fontSize: 10, textAlign: 'right',
                }}>
                  {trade.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
            {trades.length === 0 && (
              <div style={{
                padding: 24, textAlign: 'center',
                color: 'var(--text4)', fontSize: 12,
              }}>
                Waiting for trades...
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Single order book row ──
function OrderRow({ price, qty, isBid, maxQty, symbol }) {
  const pct = (parseFloat(qty) / maxQty) * 100

  return (
    <div style={{
      position:   'relative',
      display:    'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      padding:    '3px 16px',
      alignItems: 'center',
    }}>
      {/* Depth bar background */}
      <div style={{
        position:   'absolute',
        top: 0, bottom: 0,
        right:      isBid ? 0 : 'auto',
        left:       isBid ? 'auto' : 0,
        width:      `${pct}%`,
        background: isBid ? 'rgba(34,197,94,0.08)' : 'rgba(244,63,94,0.08)',
        pointerEvents: 'none',
        transition: 'width 0.15s',
      }} />

      {/* Price */}
      <span style={{
        color:      isBid ? 'var(--green)' : 'var(--red)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   12, fontWeight: 700,
        position:   'relative', zIndex: 1,
      }}>
        {fmtPrice(price, symbol)}
      </span>

      {/* Qty */}
      <span style={{
        color:      'var(--text2)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   11,
        textAlign:  'center',
        position:   'relative', zIndex: 1,
      }}>
        {fmtAmount(qty)}
      </span>

      {/* Total */}
      <span style={{
        color:      'var(--text3)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   11,
        textAlign:  'right',
        position:   'relative', zIndex: 1,
      }}>
        {fmtTotal(price, qty)}
      </span>
    </div>
  )
}