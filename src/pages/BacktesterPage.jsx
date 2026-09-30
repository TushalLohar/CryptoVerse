import { useState, useMemo } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { FlaskConical, Play } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import CandlestickChart from "../components/CandlestickChart";

// ── Logic Functions ──

async function fetchOHLCV(coinId, days = 365) {
  try {
    const res = await fetch(
      `/api/coingecko/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
    );
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    return data.map(([ts, o, h, l, c]) => ({
      ts,
      date: new Date(ts).toLocaleDateString(),
      open: o,
      high: h,
      low: l,
      close: c,
    }));
  } catch {
    return null;
  }
}

function calcSMA(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, d) => s + d.close, 0) / period;
  });
}

function calcRSI(data, period = 14) {
  const rsi = new Array(data.length).fill(null);
  if (data.length < period + 1) return rsi;
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    rsi[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
  }
  return rsi;
}

function runBuyAndHold(data, initialCapital) {
  if (!data || !data.length) return null;
  const entryPrice = data[0].close;
  const shares = initialCapital / entryPrice;
  const equity = data.map((d) => ({
    date: d.date,
    equity: shares * d.close,
    price: d.close,
  }));
  return {
    equity,
    trades: [{ type: "buy", date: data[0].date, price: entryPrice }],
    totalReturn:
      ((equity.at(-1).equity - initialCapital) / initialCapital) * 100,
    finalEquity: equity.at(-1).equity,
    maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
    winRate: null,
    numTrades: 1,
  };
}

function runMACrossover(data, shortPeriod, longPeriod, initialCapital) {
  const shortSMA = calcSMA(data, shortPeriod);
  const longSMA = calcSMA(data, longPeriod);
  let capital = initialCapital,
    shares = 0,
    inTrade = false;
  const trades = [],
    equity = [];

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const s = shortSMA[i],
      l = longSMA[i];
    if (s !== null && l !== null && i > 0) {
      const prevS = shortSMA[i - 1],
        prevL = longSMA[i - 1];
      if (prevS !== null && prevL !== null) {
        if (prevS <= prevL && s > l && !inTrade) {
          shares = capital / price;
          capital = 0;
          inTrade = true;
          trades.push({ type: "buy", date: data[i].date, price, i });
        } else if (prevS >= prevL && s < l && inTrade) {
          capital = shares * price;
          shares = 0;
          inTrade = false;
          const lastBuy = trades.filter((t) => t.type === "buy").at(-1);
          trades.push({
            type: "sell",
            date: data[i].date,
            price,
            i,
            returnPct: lastBuy
              ? ((price - lastBuy.price) / lastBuy.price) * 100
              : 0,
          });
        }
      }
    }
    equity.push({
      date: data[i].date,
      equity: capital + shares * price,
      price,
      shortSMA: s,
      longSMA: l,
      signal: trades.find((t) => t.i === i)?.type || null,
    });
  }
  const finalEquity = capital + shares * (data.at(-1)?.close || 0);
  return {
    equity,
    trades,
    totalReturn: ((finalEquity - initialCapital) / initialCapital) * 100,
    finalEquity,
    maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
    winRate:
      trades.filter((t) => t.type === "sell").length > 0
        ? (trades.filter((t) => t.type === "sell" && t.returnPct > 0).length /
            trades.filter((t) => t.type === "sell").length) *
          100
        : null,
    numTrades: trades.filter((t) => t.type === "sell").length,
  };
}

function runRSIStrategy(data, oversold, overbought, initialCapital) {
  const rsiValues = calcRSI(data, 14);
  let capital = initialCapital,
    shares = 0,
    inTrade = false;
  const trades = [],
    equity = [];
  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    const rsi = rsiValues[i];
    if (rsi !== null) {
      if (rsi < oversold && !inTrade) {
        shares = capital / price;
        capital = 0;
        inTrade = true;
        trades.push({ type: "buy", date: data[i].date, price, i });
      } else if (rsi > overbought && inTrade) {
        capital = shares * price;
        shares = 0;
        inTrade = false;
        const lastBuy = trades.filter((t) => t.type === "buy").at(-1);
        trades.push({
          type: "sell",
          date: data[i].date,
          price,
          i,
          returnPct: lastBuy
            ? ((price - lastBuy.price) / lastBuy.price) * 100
            : 0,
        });
      }
    }
    equity.push({
      date: data[i].date,
      equity: capital + shares * price,
      price,
      rsi,
    });
  }
  const finalEquity = capital + shares * (data.at(-1)?.close || 0);
  return {
    equity,
    trades,
    totalReturn: ((finalEquity - initialCapital) / initialCapital) * 100,
    finalEquity,
    maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
    winRate:
      trades.filter((t) => t.type === "sell").length > 0
        ? (trades.filter((t) => t.type === "sell" && t.returnPct > 0).length /
            trades.filter((t) => t.type === "sell").length) *
          100
        : null,
    numTrades: trades.filter((t) => t.type === "sell").length,
  };
}

function calcMaxDrawdown(arr) {
  let peak = -Infinity,
    maxDD = 0;
  for (const val of arr) {
    if (val > peak) peak = val;
    const dd = ((peak - val) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function generateSyntheticOHLCV(days) {
  let price = 45000 + Math.random() * 20000;
  return Array.from({ length: days + 1 }, (_, i) => {
    price = price * (1 + (Math.random() - 0.48) * 0.04);
    const open = price,
      close = price * (1 + (Math.random() - 0.5) * 0.02);
    const ts = Date.now() - (days - i) * 86400000;
    return {
      ts,
      date: new Date(ts).toLocaleDateString(),
      open,
      high: Math.max(open, close) * 1.01,
      low: Math.min(open, close) * 0.99,
      close,
    };
  });
}

// ── Constants ──

const COINS = [
  { id: "bitcoin", label: "Bitcoin (BTC)" },
  { id: "ethereum", label: "Ethereum (ETH)" },
  { id: "solana", label: "Solana (SOL)" },
  { id: "bnb", label: "BNB" },
];

const STRATEGIES = [
  { key: "buyhold", label: "📈 Buy & Hold" },
  { key: "ma", label: "📊 MA Crossover" },
  { key: "rsi", label: "📉 RSI Oversold/Overbought" },
];

const TIMEFRAMES = [
  { value: 90, label: "3 Months" },
  { value: 180, label: "6 Months" },
  { value: 365, label: "1 Year" },
];

// ── Component ──

export default function BacktesterPage() {
  usePageTitle("Backtester");

  const [coin, setCoin] = useState(COINS[0]);
  const [strategy, setStrategy] = useState("ma");
  const [days, setDays] = useState(365);
  const [capital, setCapital] = useState(10000);
  const [shortPeriod, setShortPeriod] = useState(20);
  const [longPeriod, setLongPeriod] = useState(50);
  const [oversold, setOversold] = useState(30);
  const [overbought, setOverbought] = useState(70);
  const [ohlcv, setOhlcv] = useState(null);
  const [loading, setLoading] = useState(false);
  const { result, bhResult } = useMemo(() => {
    if (!ohlcv) return { result: null, bhResult: null };
    let res = null;
    if (strategy === "buyhold") res = runBuyAndHold(ohlcv, capital);
    else if (strategy === "ma")
      res = runMACrossover(ohlcv, shortPeriod, longPeriod, capital);
    else if (strategy === "rsi")
      res = runRSIStrategy(ohlcv, oversold, overbought, capital);

    return {
      result: res,
      bhResult: runBuyAndHold(ohlcv, capital),
    };
  }, [ohlcv, strategy, shortPeriod, longPeriod, oversold, overbought, capital]);

  const loadAndRun = async () => {
    setLoading(true);
    const data = await fetchOHLCV(coin.id, days);
    const final =
      !data || data.length < 10 ? generateSyntheticOHLCV(days) : data;
    setOhlcv(final);
    setLoading(false);
  };

  return (
    <div className="animate-fadeUp">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-[10px] bg-[rgba(61,142,248,0.12)] flex items-center justify-center">
          <FlaskConical size={18} className="text-[#3d8ef8]" />
        </div>
        <div>
          <h1 className="text-text-1 text-[22px] font-bold font-display">
            Strategy Backtester
          </h1>
          <p className="text-text-3 text-[13px] mt-0.5">
            Test trading strategies on historical price data
          </p>
        </div>
      </div>

      {/* Config Panel */}
      <div className="bg-bg-elevated border border-border rounded-[14px] p-5 mb-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-text-3 text-[11px] font-semibold mb-1.5 ml-1">
              Coin
            </label>
            <select
              value={coin.id}
              onChange={(e) =>
                setCoin(COINS.find((c) => c.id === e.target.value))
              }
              className="w-full p-[9px_12px] bg-bg-base border border-border-md rounded-lg text-text-1 text-[13px] outline-none cursor-pointer hover:border-blue transition-colors"
            >
              {COINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-text-3 text-[11px] font-semibold mb-1.5 ml-1">
              Timeframe
            </label>
            <select
              value={days}
              onChange={(e) => setDays(+e.target.value)}
              className="w-full p-[9px_12px] bg-bg-base border border-border-md rounded-lg text-text-1 text-[13px] outline-none cursor-pointer hover:border-blue transition-colors"
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-text-3 text-[11px] font-semibold mb-1.5 ml-1">
              Capital ($)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(+e.target.value)}
              className="w-full p-[9px_12px] bg-bg-base border border-border-md rounded-lg text-text-1 text-[13px] outline-none focus:border-blue transition-colors"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-text-3 text-[11px] font-semibold mb-1.5 ml-1">
              Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full p-[9px_12px] bg-bg-base border border-border-md rounded-lg text-text-1 text-[13px] outline-none cursor-pointer hover:border-blue transition-colors"
            >
              {STRATEGIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Strategy Params */}
        {strategy === "ma" && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ParamInput
              label={`Short MA (${shortPeriod}d)`}
              value={shortPeriod}
              min={5}
              max={50}
              onChange={setShortPeriod}
            />
            <ParamInput
              label={`Long MA (${longPeriod}d)`}
              value={longPeriod}
              min={20}
              max={200}
              onChange={setLongPeriod}
            />
          </div>
        )}
        {strategy === "rsi" && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ParamInput
              label={`Oversold (${oversold})`}
              value={oversold}
              min={10}
              max={45}
              onChange={setOversold}
            />
            <ParamInput
              label={`Overbought (${overbought})`}
              value={overbought}
              min={55}
              max={90}
              onChange={setOverbought}
            />
          </div>
        )}

        <button
          onClick={loadAndRun}
          disabled={loading}
          className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-md
            ${
              loading
                ? "bg-bg-hover text-text-4 cursor-not-allowed"
                : "bg-[#3d8ef8] text-white hover:bg-[#2b7ae6] hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.97]"
            }`}
        >
          <Play size={14} fill="currentColor" />
          {loading ? "Running Simulation..." : "Run Backtest"}
        </button>
      </div>

      {/* Main Context Chart */}
      <div className="bg-bg-elevated border border-border rounded-[14px] p-5 mb-5 shadow-sm">
        <div className="text-text-2 text-[13px] font-semibold mb-4">
          {coin.label} — Historical Context
        </div>
        <div className="h-75">
          <CandlestickChart coinId={coin.id} currency="usd" height={300} />
        </div>
      </div>

      {/* Results Section */}
      {result && bhResult && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ResultCard
              label="Total Return"
              value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`}
              color={
                result.totalReturn >= 0 ? "text-green-500" : "text-red-500"
              }
              sub={`B&H: ${bhResult.totalReturn.toFixed(2)}%`}
            />
            <ResultCard
              label="Final Equity"
              value={`$${result.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              color="text-text-1"
              sub={`Started: $${capital.toLocaleString()}`}
            />
            <ResultCard
              label="Max Drawdown"
              value={`-${result.maxDrawdown.toFixed(2)}%`}
              color="text-red-500"
              sub={`B&H: -${bhResult.maxDrawdown.toFixed(2)}%`}
            />
            <ResultCard
              label={strategy === "buyhold" ? "Type" : "Win Rate"}
              value={
                result.winRate !== null
                  ? `${result.winRate.toFixed(1)}%`
                  : "Buy & Hold"
              }
              color="text-blue"
              sub={
                result.numTrades > 0 ? `${result.numTrades} Trades` : "Passive"
              }
            />
          </div>

          {/* Performance Banner */}
          <div
            className={`p-3 px-4 rounded-[10px] border text-[13px] font-semibold
            ${result.totalReturn > bhResult.totalReturn ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"}`}
          >
            {result.totalReturn > bhResult.totalReturn
              ? `✅ Strategy outperformed Buy & Hold by ${(result.totalReturn - bhResult.totalReturn).toFixed(2)}%`
              : `❌ Strategy underperformed Buy & Hold by ${(bhResult.totalReturn - result.totalReturn).toFixed(2)}%`}
          </div>

          {/* Equity Chart */}
          <div className="bg-bg-elevated border border-border rounded-[14px] p-5 shadow-sm">
            <div className="text-text-2 text-[13px] font-semibold mb-4">
              Equity Curve — Strategy vs B&H
            </div>
            <div className="h-65 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.equity.map((e, i) => ({
                    date: e.date,
                    strategy: e.equity,
                    buyhold: bhResult.equity[i]?.equity,
                  }))}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text4)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.floor(result.equity.length / 6)}
                  />
                  <YAxis
                    tick={{ fill: "var(--text4)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-md)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <ReferenceLine
                    y={capital}
                    stroke="var(--border-md)"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="strategy"
                    stroke="#3d8ef8"
                    strokeWidth={2}
                    dot={false}
                    name="Strategy"
                  />
                  <Line
                    type="monotone"
                    dataKey="buyhold"
                    stroke="var(--text3)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Buy & Hold"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RSI Chart */}
          {strategy === "rsi" && (
            <div className="bg-bg-elevated border border-border rounded-[14px] p-5 shadow-sm">
              <div className="text-text-2 text-[13px] font-semibold mb-4">
                RSI (14)
              </div>
              <div className="h-35 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.equity}>
                    <XAxis hide dataKey="date" />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine
                      y={oversold}
                      stroke="var(--green)"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={overbought}
                      stroke="var(--red)"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="rsi"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Trade Log */}
          {result.trades.length > 0 && strategy !== "buyhold" && (
            <div className="bg-bg-elevated border border-border rounded-[14px] overflow-hidden">
              <div className="p-3 px-4 bg-bg-base border-b border-border text-text-2 text-[13px] font-bold">
                Execution Log
              </div>
              <div className="max-h-62.5 overflow-y-auto">
                {result.trades.map((trade, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-4 gap-4 p-2 px-4 items-center border-b border-border/40 last:border-none ${trade.type === "buy" ? "bg-green-500/2" : "bg-red-500/2"}`}
                  >
                    <span
                      className={`p-1 px-2 rounded-md text-[10px] font-bold uppercase w-fit ${trade.type === "buy" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                    >
                      {trade.type}
                    </span>
                    <span className="text-text-3 text-[11px] font-mono">
                      {trade.date}
                    </span>
                    <span className="text-text-1 text-[12px] font-bold font-mono">
                      ${trade.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-[12px] font-bold font-mono text-right ${trade.returnPct >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      {trade.returnPct !== undefined
                        ? `${trade.returnPct >= 0 ? "+" : ""}${trade.returnPct.toFixed(2)}%`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading & Empty states */}
      {!result && !loading && (
        <div className="p-12 text-center bg-bg-elevated border border-border rounded-[14px] text-text-3 text-sm">
          Configure your strategy above and click Run Backtest
        </div>
      )}
      {loading && (
        <div className="p-12 text-center bg-bg-elevated border border-border rounded-[14px] text-text-3 text-sm animate-pulse">
          Running simulation...
        </div>
      )}

      {/* Warning */}
      <div className="mt-5 p-3 px-4 rounded-[10px] bg-yellow-500/5 border border-yellow-500/15 text-text-4 text-[11px] leading-relaxed italic">
        ⚠️ This backtester uses historical data and does not account for
        slippage or exchange fees. Educational purposes only.
      </div>
    </div>
  );
}

// ── Sub Components ──

function ResultCard({ label, value, color, sub }) {
  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-4 shadow-sm">
      <div className="text-text-3 text-[11px] font-semibold mb-1.5">
        {label}
      </div>
      <div className={`text-xl font-extrabold font-mono ${color}`}>{value}</div>
      <div className="text-text-4 text-[11px] mt-1">{sub}</div>
    </div>
  );
}

function ParamInput({ label, value, min, max, onChange }) {
  return (
    <div className="flex flex-col flex-1">
      <label className="text-text-3 text-[11px] font-semibold mb-1.5 ml-1">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 bg-bg-base rounded-lg appearance-none cursor-pointer accent-blue"
      />
    </div>
  );
}
