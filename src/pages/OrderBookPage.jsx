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

// --- Helper Functions (Logic remains identical) ---
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
  const [asks,     setAsks]     = useState([]) 
  const [bids,     setBids]     = useState([]) 
  const [spread,   setSpread]   = useState(null)
  const [lastPrice,setLastPrice]= useState(null)
  const [priceDir, setPriceDir] = useState(null) 
  const [trades,   setTrades]   = useState([])   
  const [connected,setConnected]= useState(false)

  const wsDepthRef  = useRef(null)
  const wsTradeRef  = useRef(null)
  const prevPriceRef = useRef(null)

  useEffect(() => {
    wsDepthRef.current?.close()
    wsTradeRef.current?.close()
    setAsks([])
    setBids([])
    setTrades([])
    setConnected(false)

    const wsDepth = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth20@100ms`)
    wsDepthRef.current = wsDepth
    wsDepth.onopen  = () => setConnected(true)
    wsDepth.onclose = () => setConnected(false)
    wsDepth.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const newAsks = (data.asks || []).slice(0, depth).map(([price, qty]) => ({ price, qty }))
      const newBids = (data.bids || []).slice(0, depth).map(([price, qty]) => ({ price, qty }))
      setAsks(newAsks)
      setBids(newBids)
      if (newAsks.length && newBids.length) {
        const spreadVal = parseFloat(newAsks[0].price) - parseFloat(newBids[0].price)
        setSpread(spreadVal.toFixed(4))
      }
    }

    const wsTrade = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`)
    wsTradeRef.current = wsTrade
    wsTrade.onmessage = (e) => {
      const trade = JSON.parse(e.data)
      const price = parseFloat(trade.p)
      if (prevPriceRef.current !== null) {
        setPriceDir(price > prevPriceRef.current ? 'up' : price < prevPriceRef.current ? 'down' : null)
      }
      prevPriceRef.current = price
      setLastPrice(price)
      setTrades(prev => [{
        id: trade.t, price: trade.p, qty: trade.q, isBuy: !trade.m, time: new Date(trade.T),
      }, ...prev].slice(0, 30))
    }

    return () => {
      wsDepth.close()
      wsTrade.close()
    }
  }, [symbol, depth])

  const maxBidQty = Math.max(...bids.map(b => parseFloat(b.qty)), 1)
  const maxAskQty = Math.max(...asks.map(a => parseFloat(a.qty)), 1)
  const totalBidVol = bids.reduce((s, b) => s + parseFloat(b.qty), 0)
  const totalAskVol = asks.reduce((s, a) => s + parseFloat(a.qty), 0)
  const bidPct = totalBidVol / (totalBidVol + totalAskVol) * 100

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[rgba(61,142,248,0.12)] flex items-center justify-center">
            <BookOpen size={18} className="text-[var(--blue)]" />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">Order Book</h1>
            <p className="text-[var(--text3)] text-[13px] mt-0.5">Live Binance order book · 100ms updates</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={`w-[7px] h-[7px] rounded-full transition-all duration-300 ${connected ? 'bg-[var(--green)] shadow-[0_0_6px_var(--green)]' : 'bg-[var(--red)]'}`} />
          <span className="text-[var(--text3)] text-xs font-semibold">{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2.5 mb-4 items-center">
        <div className="flex gap-1">
          {SYMBOLS.map(s => (
            <button
              key={s.value}
              onClick={() => setSymbol(s.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer 
                ${symbol === s.value ? 'bg-[var(--blue)] text-white border-[var(--blue)]' : 'bg-[var(--bg-elevated)] text-[var(--text3)] border-[var(--border)]'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-[var(--border)]" />
        <div className="flex gap-1">
          {DEPTHS.map(d => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors
                ${depth === d ? 'bg-[var(--bg-hover)] text-[var(--text1)] border-[var(--border-md)]' : 'bg-transparent text-[var(--text3)] border-[var(--border)]'}`}
            >
              {d} levels
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        
        {/* Order Book Column */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col">
          {/* Column headers */}
          <div className="grid grid-cols-3 px-4 py-2.5 border-bottom border-[var(--border)] bg-[var(--bg-base)] text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider">
            <span>Price (USDT)</span>
            <span className="text-center">Amount ({symbol.replace('usdt', '').toUpperCase()})</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks */}
          <div className="py-1">
            {[...asks].reverse().map((ask, i) => (
              <OrderRow key={`ask-${i}`} price={ask.price} qty={ask.qty} isBid={false} maxQty={maxAskQty} symbol={symbol} />
            ))}
          </div>

          {/* Spread / Last Price */}
          <div className="flex items-center justify-center gap-3 py-2 bg-[var(--bg-base)] border-y border-[var(--border)]">
            <div className={`font-[var(--ff-mono)] font-extrabold text-xl transition-colors duration-300 
              ${priceDir === 'up' ? 'text-[var(--green)]' : priceDir === 'down' ? 'text-[var(--red)]' : 'text-[var(--text1)]'}`}>
              {lastPrice ? fmtPrice(lastPrice.toString(), symbol) : '—'}
            </div>
            {spread && (
              <div className="text-[var(--text3)] text-[11px] font-[var(--ff-mono)]">Spread: {spread}</div>
            )}
          </div>

          {/* Bids */}
          <div className="py-1">
            {bids.map((bid, i) => (
              <OrderRow key={`bid-${i}`} price={bid.price} qty={bid.qty} isBid={true} maxQty={maxBidQty} symbol={symbol} />
            ))}
          </div>

          {/* Imbalance bar */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-base)]">
            <div className="flex justify-between mb-1.5 text-[11px] font-bold">
              <span className="text-[var(--green)]">Bids {bidPct.toFixed(1)}%</span>
              <span className="text-[var(--red)]">{(100 - bidPct).toFixed(1)}% Asks</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[var(--green)] to-[var(--blue)] transition-all duration-300" 
                style={{ width: `${bidPct}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Recent Trades Column */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col h-fit max-h-[600px]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[var(--border)] bg-[var(--bg-base)]">
            <Activity size={13} className="text-[var(--text3)]" />
            <span className="text-[var(--text2)] text-xs font-bold uppercase tracking-wide">Recent Trades</span>
          </div>
          
          <div className="grid grid-cols-3 px-3.5 py-1.5 border-b border-[var(--border)] text-[10px] font-bold text-[var(--text3)] uppercase">
            <span>Price</span>
            <span className="text-center">Amount</span>
            <span className="text-right">Time</span>
          </div>

          <div className="overflow-y-auto scrollbar-hide flex-1">
            {trades.map(trade => (
              <div key={trade.id} className="grid grid-cols-3 px-3.5 py-1.5 items-center hover:bg-[var(--bg-hover)] transition-colors">
                <span className={`font-[var(--ff-mono)] text-[11px] font-bold ${trade.isBuy ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {fmtPrice(trade.price, symbol)}
                </span>
                <span className="text-[var(--text2)] font-[var(--ff-mono)] text-[11px] text-center">{fmtAmount(trade.qty)}</span>
                <span className="text-[var(--text4)] font-[var(--ff-mono)] text-[10px] text-right">
                  {trade.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
            ))}
            {trades.length === 0 && (
              <div className="p-6 text-center text-[var(--text4)] text-xs italic">Waiting for trades...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderRow({ price, qty, isBid, maxQty, symbol }) {
  const pct = (parseFloat(qty) / maxQty) * 100

  return (
    <div className="relative grid grid-cols-3 px-4 py-0.5 items-center group">
      {/* Depth bar background */}
      <div 
        className={`absolute top-0 bottom-0 pointer-events-none transition-all duration-150 
          ${isBid ? 'right-0 bg-[rgba(34,197,94,0.08)]' : 'left-0 bg-[rgba(244,63,94,0.08)]'}`}
        style={{ width: `${pct}%` }} 
      />

      <span className={`relative z-1 font-[var(--ff-mono)] text-xs font-bold ${isBid ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {fmtPrice(price, symbol)}
      </span>
      <span className="relative z-1 text-[var(--text2)] font-[var(--ff-mono)] text-[11px] text-center">
        {fmtAmount(qty)}
      </span>
      <span className="relative z-1 text-[var(--text3)] font-[var(--ff-mono)] text-[11px] text-right">
        {fmtTotal(price, qty)}
      </span>
    </div>
  )
}