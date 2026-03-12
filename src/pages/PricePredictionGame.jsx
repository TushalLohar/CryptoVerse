import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Trophy, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";

const COINS = [
  { symbol: "BTC", binance: "btcusdt", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETH", binance: "ethusdt", name: "Ethereum", color: "#627eea" },
  { symbol: "SOL", binance: "solusdt", name: "Solana", color: "#9945ff" },
  { symbol: "BNB", binance: "bnbusdt", name: "BNB", color: "#f3ba2f" },
];

const COUNTDOWN = 10;
const POINTS_WIN = 10;
const POINTS_LOSE = -5;

function fmtPrice(p, symbol) {
  if (!p) return "—";
  return `$${p.toLocaleString(undefined, { 
    minimumFractionDigits: p >= 1000 || symbol === "BTC" ? 2 : 4, 
    maximumFractionDigits: p >= 1000 || symbol === "BTC" ? 2 : 6 
  })}`;
}

export default function PricePredictionGame() {
  usePageTitle("Price Prediction Game");

  const [activeCoin, setActiveCoin] = useState(COINS[0]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lockedPrice, setLockedPrice] = useState(null);
  const [resultPrice, setResultPrice] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [gameState, setGameState] = useState("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState([]);
  const [priceFlash, setPriceFlash] = useState(null);

  const wsRef = useRef(null);
  const prevPriceRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    wsRef.current?.close();
    setCurrentPrice(null);
    prevPriceRef.current = null;

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${activeCoin.binance}@trade`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const price = parseFloat(data.p);
      if (prevPriceRef.current !== null) {
        const dir = price > prevPriceRef.current ? "up" : price < prevPriceRef.current ? "down" : null;
        if (dir) {
          setPriceFlash(dir);
          setTimeout(() => setPriceFlash(null), 400);
        }
      }
      prevPriceRef.current = price;
      setCurrentPrice(price);
    };
    return () => ws.close();
  }, [activeCoin]);

  const makePrediction = (dir) => {
    if (gameState !== "idle" || !currentPrice) return;
    setPrediction(dir);
    setLockedPrice(currentPrice);
    setGameState("waiting");
    let remaining = COUNTDOWN;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        resolveResult(dir, currentPrice);
      }
    }, 1000);
  };

  const resolveResult = (dir, startPrice) => {
    const endPrice = prevPriceRef.current || startPrice;
    setResultPrice(endPrice);
    setGameState("result");
    const actualDir = endPrice > startPrice ? "up" : endPrice < startPrice ? "down" : "tie";
    const won = actualDir !== "tie" && dir === actualDir;
    const outcome = actualDir === "tie" ? "tie" : won ? "win" : "lose";
    setResult(outcome);

    if (outcome === "win") {
      setScore(s => s + POINTS_WIN);
      setStreak(s => s + 1);
    } else if (outcome === "lose") {
      setScore(s => Math.max(0, s + POINTS_LOSE));
      setStreak(0);
    }

    setHistory(h => [{
      coin: activeCoin.symbol,
      prediction: dir,
      actual: actualDir,
      change: (((endPrice - startPrice) / startPrice) * 100).toFixed(4),
      outcome
    }, ...h].slice(0, 10));
  };

  const priceDiff = resultPrice && lockedPrice ? (((resultPrice - lockedPrice) / lockedPrice) * 100).toFixed(4) : null;

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both] max-w-[800px] mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Trophy size={18} />
          </div>
          <div>
            <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">Price Prediction</h1>
            <p className="text-[var(--text3)] text-[13px] mt-0.5">Predict the price move in {COUNTDOWN} seconds</p>
          </div>
        </div>
        <button onClick={() => { setScore(0); setStreak(0); setHistory([]); setGameState("idle"); }} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-md)] text-[var(--text3)] text-xs font-semibold hover:bg-[var(--bg-hover)] transition-colors">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Score bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ScoreCard label="Score" value={score} color="text-blue-500" icon="🏆" />
        <ScoreCard label="Streak" value={streak} color="text-amber-500" icon="🔥" />
        <ScoreCard label="Rounds" value={history.length} color="text-purple-500" icon="🎮" />
      </div>

      {/* Coin selector */}
      <div className="flex gap-2 mb-5 justify-center">
        {COINS.map((coin) => (
          <button
            key={coin.symbol}
            onClick={() => setActiveCoin(coin)}
            disabled={gameState === "waiting"}
            style={{ 
              borderColor: activeCoin.symbol === coin.symbol ? coin.color : 'transparent',
              backgroundColor: activeCoin.symbol === coin.symbol ? `${coin.color}15` : 'transparent'
            }}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-50 
              ${activeCoin.symbol === coin.symbol ? '' : 'bg-[var(--bg-elevated)] text-[var(--text3)] border-[var(--border)]'}`}
          >
            {coin.symbol}
          </button>
        ))}
      </div>

      {/* Main game card */}
      <div className={`bg-[var(--bg-elevated)] border-2 rounded-[24px] p-8 text-center transition-all duration-500 mb-5
        ${result === 'win' ? 'border-green-500/40 shadow-lg shadow-green-500/5' : 
          result === 'lose' ? 'border-red-500/40' : 
          gameState === 'waiting' ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-[var(--border)]'}`}>
        
        <div className="text-[var(--text3)] text-[13px] font-semibold mb-2">{activeCoin.name}</div>
        
        <div className={`text-5xl font-extrabold font-[var(--ff-mono)] mb-1 tracking-tight transition-colors duration-200
          ${priceFlash === 'up' ? 'text-[var(--green)]' : priceFlash === 'down' ? 'text-[var(--red)]' : 'text-[var(--text1)]'}`}>
          {currentPrice ? fmtPrice(currentPrice, activeCoin.symbol) : "—"}
        </div>

        {lockedPrice && (
          <div className="text-[var(--text3)] text-xs font-[var(--ff-mono)] mb-4">
            Locked at {fmtPrice(lockedPrice, activeCoin.symbol)}
            {resultPrice && (
              <span className={`ml-2.5 font-bold ${parseFloat(priceDiff) > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                ({parseFloat(priceDiff) >= 0 ? "+" : ""}{priceDiff}%)
              </span>
            )}
          </div>
        )}

        {gameState === "waiting" && <div className="mb-5"><CountdownRing value={countdown} max={COUNTDOWN} /></div>}

        {gameState === "result" && result && (
          <div className="mb-6 animate-[scaleIn_0.3s_ease-out_both]">
            <div className="text-5xl mb-2">{result === "win" ? "🎉" : result === "lose" ? "💔" : "🤝"}</div>
            <div className={`text-2xl font-black mb-1 ${result === 'win' ? 'text-[var(--green)]' : result === 'lose' ? 'text-[var(--red)]' : 'text-amber-500'}`}>
              {result === "win" ? `+${POINTS_WIN} points!` : result === "lose" ? `${POINTS_LOSE} points` : "Tie — no points"}
            </div>
            <p className="text-[var(--text3)] text-[13px]">
              Price went <span className={`font-bold ${parseFloat(priceDiff) > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {parseFloat(priceDiff) > 0 ? "UP ↑" : parseFloat(priceDiff) < 0 ? "DOWN ↓" : "SIDEWAYS"}
              </span> by {Math.abs(parseFloat(priceDiff))}%
            </p>
          </div>
        )}

        {gameState === "idle" && (
          <div className="flex gap-4 justify-center mt-4">
            <PredictButton dir="up" onClick={() => makePrediction("up")} disabled={!currentPrice} />
            <PredictButton dir="down" onClick={() => makePrediction("down")} disabled={!currentPrice} />
          </div>
        )}

        {gameState === "waiting" && (
          <div className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl border font-black text-lg
            ${prediction === 'up' ? 'bg-green-500/10 border-green-500/30 text-[var(--green)]' : 'bg-red-500/10 border-red-500/30 text-[var(--red)]'}`}>
            {prediction === "up" ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            YOU PREDICTED {prediction?.toUpperCase()}
          </div>
        )}

        {gameState === "result" && (
          <button onClick={() => setGameState("idle")} 
            className="px-10 py-3 rounded-xl bg-[var(--blue)] text-white font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/20">
            Play Again
          </button>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-base)] text-[var(--text2)] text-[13px] font-bold uppercase tracking-wider">Round History</div>
          <div className="divide-y divide-[var(--border)]">
            {history.map((h, i) => (
              <div key={i} className={`grid grid-cols-[40px_60px_1fr_1fr_1fr_60px] gap-4 px-4 py-3 items-center text-[12px]
                ${h.outcome === 'win' ? 'bg-green-500/5' : h.outcome === 'lose' ? 'bg-red-500/5' : ''}`}>
                <span className="text-base">{h.outcome === "win" ? "✅" : h.outcome === "lose" ? "❌" : "🤝"}</span>
                <span className="text-[var(--text3)] font-mono font-bold">{h.coin}</span>
                <span className={`font-bold ${h.prediction === 'up' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{h.prediction === 'up' ? '↑ UP' : '↓ DOWN'}</span>
                <span className={`font-bold ${h.actual === 'up' ? 'text-[var(--green)]' : h.actual === 'down' ? 'text-[var(--red)]' : 'text-amber-500'}`}>
                  → {h.actual?.toUpperCase()}
                </span>
                <span className={`font-mono font-semibold ${parseFloat(h.change) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {parseFloat(h.change) >= 0 ? "+" : ""}{h.change}%
                </span>
                <span className={`font-mono font-bold text-right ${h.outcome === 'win' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {h.outcome === 'win' ? `+${POINTS_WIN}` : h.outcome === 'lose' ? `${POINTS_LOSE}` : "±0"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PredictButton({ dir, onClick, disabled }) {
  const isUp = dir === "up";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-2 px-10 py-5 rounded-2xl border-2 transition-all min-w-[160px] group disabled:opacity-40 disabled:cursor-not-allowed
      ${isUp ? 'hover:bg-green-500/10 hover:border-green-500/50 border-[var(--border-md)] text-[var(--green)]' : 
               'hover:bg-red-500/10 hover:border-red-500/50 border-[var(--border-md)] text-[var(--red)]'}`}>
      {isUp ? <TrendingUp size={32} strokeWidth={2.5} /> : <TrendingDown size={32} strokeWidth={2.5} />}
      <span className="text-lg font-black tracking-widest">{isUp ? "UP" : "DOWN"}</span>
      <span className="text-[10px] text-[var(--text4)] font-bold uppercase tracking-tighter group-hover:text-current">+{POINTS_WIN} if correct</span>
    </button>
  );
}

function CountdownRing({ value, max }) {
  const size = 80;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = value > 6 ? "stroke-green-500" : value > 3 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="relative w-20 h-20 mx-auto">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={`${color} transition-all duration-1000 ease-linear`}
          strokeDasharray={circ} strokeDashoffset={circ - (value / max) * circ} strokeLinecap="round" />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-2xl font-black font-[var(--ff-mono)] transition-colors ${color.replace('stroke', 'text')}`}>
        {value}
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color, icon }) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-[var(--text3)] text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</div>
        <div className={`${color} text-2xl font-black font-[var(--ff-mono)] leading-none`}>{value}</div>
      </div>
    </div>
  );
}