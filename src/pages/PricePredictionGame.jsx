import { useState, useEffect, useRef } from 'react'
import { usePageTitle }                from '../hooks/usePageTitle'
import { Trophy, TrendingUp, TrendingDown, Zap, RotateCcw } from 'lucide-react'

const COINS = [
  { symbol: 'BTC',  binance: 'btcusdt',  name: 'Bitcoin',  color: '#f7931a' },
  { symbol: 'ETH',  binance: 'ethusdt',  name: 'Ethereum', color: '#627eea' },
  { symbol: 'SOL',  binance: 'solusdt',  name: 'Solana',   color: '#9945ff' },
  { symbol: 'BNB',  binance: 'bnbusdt',  name: 'BNB',      color: '#f3ba2f' },
]

const COUNTDOWN  = 10   // seconds to wait for result
const POINTS_WIN = 10
const POINTS_LOSE= -5

function fmtPrice(p, symbol) {
  if (!p) return '—'
  if (symbol === 'BTC') return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (p >= 1000) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (p >= 1)    return `$${p.toFixed(4)}`
  return `$${p.toFixed(6)}`
}

// Game states: 'idle' | 'waiting' | 'result'
export default function PricePredictionGame() {
  usePageTitle('Price Prediction Game')

  const [activeCoin,   setActiveCoin]   = useState(COINS[0])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [lockedPrice,  setLockedPrice]  = useState(null)
  const [resultPrice,  setResultPrice]  = useState(null)
  const [prediction,   setPrediction]   = useState(null) // 'up' | 'down'
  const [gameState,    setGameState]    = useState('idle')
  const [countdown,    setCountdown]    = useState(COUNTDOWN)
  const [result,       setResult]       = useState(null)  // 'win' | 'lose' | 'tie'
  const [score,        setScore]        = useState(0)
  const [streak,       setStreak]       = useState(0)
  const [history,      setHistory]      = useState([])
  const [priceFlash,   setPriceFlash]   = useState(null)  // 'up' | 'down'

  const wsRef        = useRef(null)
  const prevPriceRef = useRef(null)
  const timerRef     = useRef(null)

  // Connect WebSocket for selected coin
  useEffect(() => {
    wsRef.current?.close()
    setCurrentPrice(null)
    prevPriceRef.current = null

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${activeCoin.binance}@trade`
    )
    wsRef.current = ws

    ws.onmessage = (e) => {
      const trade = JSON.parse(e.data)
      const price = parseFloat(trade.p)

      // Flash animation on price change
      if (prevPriceRef.current !== null) {
        const dir = price > prevPriceRef.current ? 'up' : price < prevPriceRef.current ? 'down' : null
        if (dir) {
          setPriceFlash(dir)
          setTimeout(() => setPriceFlash(null), 400)
        }
      }

      prevPriceRef.current = price
      setCurrentPrice(price)
    }

    return () => ws.close()
  }, [activeCoin])

  // Reset game when coin changes
  useEffect(() => {
    if (gameState !== 'idle') {
      clearTimeout(timerRef.current)
      setGameState('idle')
      setPrediction(null)
      setLockedPrice(null)
      setResultPrice(null)
      setResult(null)
      setCountdown(COUNTDOWN)
    }
  }, [activeCoin])

  const makePrediction = (dir) => {
    if (gameState !== 'idle' || !currentPrice) return

    setPrediction(dir)
    setLockedPrice(currentPrice)
    setGameState('waiting')
    setCountdown(COUNTDOWN)
    setResult(null)
    setResultPrice(null)

    // Countdown ticker
    let remaining = COUNTDOWN
    const tick = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)

      if (remaining <= 0) {
        clearInterval(tick)
        // Resolve result using current price from ref
        resolveResult(dir, currentPrice)
      }
    }, 1000)

    timerRef.current = tick
  }

  const resolveResult = (dir, startPrice) => {
    // Get latest price from WebSocket via ref
    const endPrice = prevPriceRef.current || startPrice

    setResultPrice(endPrice)
    setGameState('result')

    const actualDir = endPrice > startPrice ? 'up' : endPrice < startPrice ? 'down' : 'tie'
    const won = actualDir === 'tie' ? false : dir === actualDir

    const outcome = actualDir === 'tie' ? 'tie' : won ? 'win' : 'lose'
    setResult(outcome)

    if (outcome === 'win') {
      setScore(s => s + POINTS_WIN)
      setStreak(s => s + 1)
    } else if (outcome === 'lose') {
      setScore(s => Math.max(0, s + POINTS_LOSE))
      setStreak(0)
    }

    setHistory(h => [{
      coin:       activeCoin.symbol,
      prediction: dir,
      actual:     actualDir,
      startPrice,
      endPrice,
      outcome,
      change:     ((endPrice - startPrice) / startPrice * 100).toFixed(4),
    }, ...h].slice(0, 10))
  }

  const playAgain = () => {
    setGameState('idle')
    setPrediction(null)
    setLockedPrice(null)
    setResultPrice(null)
    setResult(null)
    setCountdown(COUNTDOWN)
  }

  const resetScore = () => {
    setScore(0)
    setStreak(0)
    setHistory([])
    playAgain()
  }

  const priceDiff = resultPrice && lockedPrice
    ? ((resultPrice - lockedPrice) / lockedPrice * 100).toFixed(4)
    : null

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both', maxWidth: 800, margin: '0 auto' }}>

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
            <Trophy size={18} color="var(--gold)" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text1)', fontSize: 22, fontWeight: 700,
              fontFamily: 'var(--ff-display)' }}>
              Price Prediction
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Predict if the price goes up or down in {COUNTDOWN} seconds
            </p>
          </div>
        </div>

        <button
          onClick={resetScore}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8,
            border: '1px solid var(--border-md)',
            background: 'transparent', color: 'var(--text3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>

      {/* Score bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, marginBottom: 24,
      }}>
        <ScoreCard label="Score"      value={score}  color="var(--blue)"  icon="🏆" />
        <ScoreCard label="Streak"     value={streak} color="var(--gold)"  icon="🔥" />
        <ScoreCard label="Rounds"     value={history.length} color="var(--purple)" icon="🎮" />
      </div>

      {/* Coin selector */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        justifyContent: 'center',
      }}>
        {COINS.map(coin => (
          <button
            key={coin.symbol}
            onClick={() => setActiveCoin(coin)}
            disabled={gameState === 'waiting'}
            style={{
              padding: '8px 18px', borderRadius: 10,
              border: `2px solid ${activeCoin.symbol === coin.symbol ? coin.color : 'var(--border)'}`,
              background: activeCoin.symbol === coin.symbol ? `${coin.color}18` : 'var(--bg-elevated)',
              color: activeCoin.symbol === coin.symbol ? coin.color : 'var(--text3)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
              opacity: gameState === 'waiting' ? 0.5 : 1,
            }}
          >
            {coin.symbol}
          </button>
        ))}
      </div>

      {/* Main game card */}
      <div style={{
        background:   'var(--bg-elevated)',
        border:       `2px solid ${
          result === 'win'  ? 'rgba(34,197,94,0.4)'  :
          result === 'lose' ? 'rgba(244,63,94,0.4)'  :
          result === 'tie'  ? 'rgba(245,158,11,0.4)' :
          gameState === 'waiting' ? 'var(--blue)' : 'var(--border)'
        }`,
        borderRadius: 20,
        padding:      32,
        textAlign:    'center',
        transition:   'border-color 0.3s',
        marginBottom: 20,
      }}>

        {/* Coin name */}
        <div style={{ color: 'var(--text3)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          {activeCoin.name}
        </div>

        {/* Live price */}
        <div style={{
          fontSize:   48,
          fontWeight: 800,
          fontFamily: 'var(--ff-mono)',
          color:      priceFlash === 'up'   ? 'var(--green)' :
                      priceFlash === 'down' ? 'var(--red)'   : 'var(--text1)',
          transition: 'color 0.2s',
          marginBottom: 4,
          letterSpacing: '-0.02em',
        }}>
          {currentPrice ? fmtPrice(currentPrice, activeCoin.symbol) : '—'}
        </div>

        {/* Locked price indicator */}
        {lockedPrice && (
          <div style={{
            color: 'var(--text3)', fontSize: 12,
            fontFamily: 'var(--ff-mono)', marginBottom: 16,
          }}>
            Locked at {fmtPrice(lockedPrice, activeCoin.symbol)}
            {resultPrice && (
              <span style={{
                marginLeft: 10,
                color: parseFloat(priceDiff) > 0 ? 'var(--green)'
                     : parseFloat(priceDiff) < 0 ? 'var(--red)'
                     : 'var(--text3)',
                fontWeight: 700,
              }}>
                ({parseFloat(priceDiff) >= 0 ? '+' : ''}{priceDiff}%)
              </span>
            )}
          </div>
        )}

        {/* Countdown ring */}
        {gameState === 'waiting' && (
          <div style={{ marginBottom: 20 }}>
            <CountdownRing value={countdown} max={COUNTDOWN} />
          </div>
        )}

        {/* Result */}
        {gameState === 'result' && result && (
          <div style={{
            marginBottom: 24,
            animation: 'scaleIn 0.3s ease-out both',
          }}>
            <div style={{
              fontSize:   52,
              marginBottom: 8,
            }}>
              {result === 'win'  ? '🎉' : result === 'lose' ? '💔' : '🤝'}
            </div>
            <div style={{
              fontSize:   24,
              fontWeight: 800,
              color:      result === 'win'  ? 'var(--green)' :
                          result === 'lose' ? 'var(--red)'   : 'var(--gold)',
              marginBottom: 4,
            }}>
              {result === 'win'  ? `+${POINTS_WIN} points!` :
               result === 'lose' ? `${POINTS_LOSE} points` :
               'Tie — no points'}
            </div>
            <div style={{ color: 'var(--text3)', fontSize: 13 }}>
              Price went{' '}
              <span style={{
                fontWeight: 700,
                color: parseFloat(priceDiff) > 0 ? 'var(--green)'
                     : parseFloat(priceDiff) < 0 ? 'var(--red)'
                     : 'var(--text3)',
              }}>
                {parseFloat(priceDiff) > 0 ? '↑ UP' : parseFloat(priceDiff) < 0 ? '↓ DOWN' : '→ SIDEWAYS'}
              </span>
              {' '}by {Math.abs(parseFloat(priceDiff))}%
            </div>
          </div>
        )}

        {/* Prediction buttons / Play again */}
        {gameState === 'idle' && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <PredictButton
              dir="up"
              onClick={() => makePrediction('up')}
              disabled={!currentPrice}
            />
            <PredictButton
              dir="down"
              onClick={() => makePrediction('down')}
              disabled={!currentPrice}
            />
          </div>
        )}

        {gameState === 'waiting' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 28px', borderRadius: 12,
            background: prediction === 'up' ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
            border: `1px solid ${prediction === 'up' ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
            display: 'inline-flex', margin: '0 auto',
          }}>
            {prediction === 'up'
              ? <TrendingUp  size={20} color="var(--green)" />
              : <TrendingDown size={20} color="var(--red)"  />
            }
            <span style={{
              color:      prediction === 'up' ? 'var(--green)' : 'var(--red)',
              fontWeight: 800, fontSize: 16,
            }}>
              You predicted {prediction === 'up' ? 'UP ↑' : 'DOWN ↓'}
            </span>
          </div>
        )}

        {gameState === 'result' && (
          <button
            onClick={playAgain}
            style={{
              padding: '12px 36px', borderRadius: 12, border: 'none',
              background: 'var(--blue)', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2d7ef0'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--blue)'}
          >
            Play Again
          </button>
        )}

        {/* Not connected message */}
        {!currentPrice && gameState === 'idle' && (
          <div style={{ color: 'var(--text4)', fontSize: 12, marginTop: 16 }}>
            Connecting to live prices...
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-base)',
            color: 'var(--text2)', fontSize: 13, fontWeight: 700,
          }}>
            Round History
          </div>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 60px 80px 80px 100px 1fr',
                gap: 12, padding: '10px 16px', alignItems: 'center',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                background: h.outcome === 'win'  ? 'rgba(34,197,94,0.04)'
                          : h.outcome === 'lose' ? 'rgba(244,63,94,0.04)'
                          : 'transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>
                {h.outcome === 'win' ? '✅' : h.outcome === 'lose' ? '❌' : '🤝'}
              </span>
              <span style={{ color: 'var(--text3)', fontSize: 12,
                fontFamily: 'var(--ff-mono)', fontWeight: 700 }}>
                {h.coin}
              </span>
              <span style={{
                color: h.prediction === 'up' ? 'var(--green)' : 'var(--red)',
                fontSize: 12, fontWeight: 700,
              }}>
                {h.prediction === 'up' ? '↑ UP' : '↓ DOWN'}
              </span>
              <span style={{
                color: h.actual === 'up' ? 'var(--green)' : h.actual === 'down' ? 'var(--red)' : 'var(--gold)',
                fontSize: 12, fontWeight: 700,
              }}>
                → {h.actual === 'up' ? '↑ UP' : h.actual === 'down' ? '↓ DOWN' : '→ TIE'}
              </span>
              <span style={{
                color: parseFloat(h.change) > 0 ? 'var(--green)'
                     : parseFloat(h.change) < 0 ? 'var(--red)' : 'var(--text3)',
                fontFamily: 'var(--ff-mono)', fontSize: 12, fontWeight: 600,
              }}>
                {parseFloat(h.change) >= 0 ? '+' : ''}{h.change}%
              </span>
              <span style={{
                color: h.outcome === 'win'  ? 'var(--green)'
                     : h.outcome === 'lose' ? 'var(--red)' : 'var(--gold)',
                fontFamily: 'var(--ff-mono)', fontSize: 12, fontWeight: 700,
                textAlign: 'right',
              }}>
                {h.outcome === 'win'  ? `+${POINTS_WIN}` :
                 h.outcome === 'lose' ? `${POINTS_LOSE}` : '±0'}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ── Predict button ──
function PredictButton({ dir, onClick, disabled }) {
  const [hovered, setHovered] = useState(false)
  const isUp = dir === 'up'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          8,
        padding:      '20px 40px',
        borderRadius: 16,
        border:       `2px solid ${
          disabled ? 'var(--border)' :
          hovered ? (isUp ? 'var(--green)' : 'var(--red)') :
          'var(--border-md)'
        }`,
        background:   disabled ? 'transparent' :
          hovered ? (isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)') :
          'var(--bg-base)',
        color:        disabled ? 'var(--text4)' :
          isUp ? 'var(--green)' : 'var(--red)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:   'all 0.15s',
        minWidth:     140,
      }}
    >
      {isUp
        ? <TrendingUp  size={32} strokeWidth={2.5} />
        : <TrendingDown size={32} strokeWidth={2.5} />
      }
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.05em' }}>
        {isUp ? '↑ UP' : '↓ DOWN'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text4)', fontWeight: 500 }}>
        {isUp ? `+${POINTS_WIN} if correct` : `+${POINTS_WIN} if correct`}
      </span>
    </button>
  )
}

// ── Countdown ring ──
function CountdownRing({ value, max }) {
  const size   = 80
  const stroke = 6
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const pct    = value / max
  const dash   = circ * pct

  const color = value > 6 ? 'var(--green)'
              : value > 3 ? 'var(--gold)'
              : 'var(--red)'

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {/* Progress */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: 22, fontWeight: 800,
        fontFamily: 'var(--ff-mono)',
        transition: 'color 0.3s',
      }}>
        {value}
      </div>
    </div>
  )
}

function ScoreCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 3 }}>{label}</div>
        <div style={{ color, fontSize: 24, fontWeight: 800,
          fontFamily: 'var(--ff-mono)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}