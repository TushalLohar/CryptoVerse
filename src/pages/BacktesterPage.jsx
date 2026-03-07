import { useState, useEffect } from "react";
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
  if (!data.length) return null;
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

  if (inTrade) capital = shares * data.at(-1).close;
  const finalEquity = capital + shares * (data.at(-1)?.close || 0);
  const sellTrades = trades.filter((t) => t.type === "sell");

  return {
    equity,
    trades,
    totalReturn: ((finalEquity - initialCapital) / initialCapital) * 100,
    finalEquity,
    maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
    winRate:
      sellTrades.length > 0
        ? (sellTrades.filter((t) => t.returnPct > 0).length /
            sellTrades.length) *
          100
        : null,
    numTrades: sellTrades.length,
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
  const sellTrades = trades.filter((t) => t.type === "sell");

  return {
    equity,
    trades,
    totalReturn: ((finalEquity - initialCapital) / initialCapital) * 100,
    finalEquity,
    maxDrawdown: calcMaxDrawdown(equity.map((e) => e.equity)),
    winRate:
      sellTrades.length > 0
        ? (sellTrades.filter((t) => t.returnPct > 0).length /
            sellTrades.length) *
          100
        : null,
    numTrades: sellTrades.length,
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
    const change = (Math.random() - 0.48) * 0.04;
    price = price * (1 + change);
    const open = price;
    const close = price * (1 + (Math.random() - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const ts = Date.now() - (days - i) * 86400000;
    return {
      ts,
      date: new Date(ts).toLocaleDateString(),
      open,
      high,
      low,
      close,
    };
  });
}

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

const selectStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-base)",
  border: "1px solid var(--border-md)",
  borderRadius: 8,
  color: "var(--text1)",
  fontSize: 13,
  outline: "none",
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-base)",
  border: "1px solid var(--border-md)",
  borderRadius: 8,
  color: "var(--text1)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

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
  const [result, setResult] = useState(null);
  const [bhResult, setBhResult] = useState(null);

  const runStrategy = (data) => {
    let res;
    if (strategy === "buyhold") res = runBuyAndHold(data, capital);
    else if (strategy === "ma")
      res = runMACrossover(data, shortPeriod, longPeriod, capital);
    else if (strategy === "rsi")
      res = runRSIStrategy(data, oversold, overbought, capital);
    setBhResult(runBuyAndHold(data, capital));
    setResult(res);
  };

  const loadAndRun = async () => {
    setLoading(true);
    setResult(null);
    const data = await fetchOHLCV(coin.id, days);
    const final =
      !data || data.length < 10 ? generateSyntheticOHLCV(days) : data;
    setOhlcv(final);
    runStrategy(final);
    setLoading(false);
  };

  useEffect(() => {
    if (ohlcv) runStrategy(ohlcv);
  }, [strategy, shortPeriod, longPeriod, oversold, overbought, capital]);

  return (
    <div style={{ animation: "fadeUp 0.25s ease-out both" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(61,142,248,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FlaskConical size={18} color="var(--blue)" />
        </div>
        <div>
          <h1
            style={{
              color: "var(--text1)",
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "var(--ff-display)",
            }}
          >
            Strategy Backtester
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 2 }}>
            Test trading strategies on historical price data
          </p>
        </div>
      </div>

      {/* Config */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label
              style={{
                color: "var(--text3)",
                fontSize: 11,
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Coin
            </label>
            <select
              value={coin.id}
              onChange={(e) =>
                setCoin(COINS.find((c) => c.id === e.target.value))
              }
              style={selectStyle}
            >
              {COINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                color: "var(--text3)",
                fontSize: 11,
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Timeframe
            </label>
            <select
              value={days}
              onChange={(e) => setDays(+e.target.value)}
              style={selectStyle}
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                color: "var(--text3)",
                fontSize: 11,
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Starting Capital ($)
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(+e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              style={{
                color: "var(--text3)",
                fontSize: 11,
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              style={selectStyle}
            >
              {STRATEGIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {strategy === "ma" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <ParamInput
              label={`Short MA (${shortPeriod} days)`}
              value={shortPeriod}
              min={5}
              max={50}
              onChange={setShortPeriod}
            />
            <ParamInput
              label={`Long MA (${longPeriod} days)`}
              value={longPeriod}
              min={20}
              max={200}
              onChange={setLongPeriod}
            />
          </div>
        )}

        {strategy === "rsi" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: loading ? "var(--bg-hover)" : "var(--blue)",
            color: loading ? "var(--text4)" : "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <Play size={14} />
          {loading ? "Running..." : "Run Backtest"}
        </button>
      </div>

      {/* Candlestick Chart — always visible once coin is selected */}
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: "var(--text2)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {coin.label} — Price Chart
        </div>
        <CandlestickChart coinId={coin.id} currency="usd" height={300} />
      </div>

      {/* Results */}
      {result && bhResult && (
        <>
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <ResultCard
              label="Total Return"
              value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`}
              color={result.totalReturn >= 0 ? "var(--green)" : "var(--red)"}
              sub={`B&H: ${bhResult.totalReturn.toFixed(2)}%`}
            />
            <ResultCard
              label="Final Portfolio"
              value={`$${result.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              color="var(--text1)"
              sub={`Started: $${capital.toLocaleString()}`}
            />
            <ResultCard
              label="Max Drawdown"
              value={`-${result.maxDrawdown.toFixed(2)}%`}
              color="var(--red)"
              sub={`B&H: -${bhResult.maxDrawdown.toFixed(2)}%`}
            />
            <ResultCard
              label={strategy === "buyhold" ? "Strategy" : "Win Rate"}
              value={
                result.winRate !== null
                  ? `${result.winRate.toFixed(1)}%`
                  : "Buy & Hold"
              }
              color="var(--blue)"
              sub={
                result.numTrades !== null
                  ? `${result.numTrades} trades`
                  : "Passive"
              }
            />
          </div>

          {/* vs B&H banner */}
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              marginBottom: 16,
              background:
                result.totalReturn > bhResult.totalReturn
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(244,63,94,0.08)",
              border: `1px solid ${
                result.totalReturn > bhResult.totalReturn
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(244,63,94,0.2)"
              }`,
              color:
                result.totalReturn > bhResult.totalReturn
                  ? "var(--green)"
                  : "var(--red)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {result.totalReturn > bhResult.totalReturn
              ? `✅ Strategy outperformed Buy & Hold by ${(result.totalReturn - bhResult.totalReturn).toFixed(2)}%`
              : `❌ Strategy underperformed Buy & Hold by ${(bhResult.totalReturn - result.totalReturn).toFixed(2)}%`}
          </div>

          {/* Equity curve */}
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                color: "var(--text2)",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Equity Curve — Strategy vs Buy & Hold
            </div>
            {(() => {
              const merged = result.equity.map((e, i) => ({
                date: e.date,
                strategy: e.equity,
                buyhold: bhResult.equity[i]?.equity,
              }));
              return (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={merged}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--text4)", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(merged.length / 6)}
                    />
                    <YAxis
                      tick={{ fill: "var(--text4)", fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-md)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(v, name) => [
                        `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                        name === "strategy" ? "Strategy" : "Buy & Hold",
                      ]}
                      labelStyle={{ color: "var(--text3)" }}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "strategy" ? "Strategy" : "Buy & Hold"
                      }
                      wrapperStyle={{ fontSize: 12, color: "var(--text2)" }}
                    />
                    <ReferenceLine
                      y={capital}
                      stroke="var(--border-md)"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="strategy"
                      stroke="var(--blue)"
                      strokeWidth={2}
                      dot={false}
                      animationDuration={500}
                    />
                    <Line
                      type="monotone"
                      dataKey="buyhold"
                      stroke="var(--text3)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      animationDuration={500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* RSI chart */}
          {strategy === "rsi" && result.equity[0]?.rsi !== undefined && (
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "20px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: "var(--text2)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                RSI (14)
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={result.equity}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text4)", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(result.equity.length / 6)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--text4)", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-md)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v) => [v?.toFixed(2), "RSI"]}
                    labelStyle={{ color: "var(--text3)" }}
                    itemStyle={{ color: "var(--purple)" }}
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
                  <ReferenceLine
                    y={50}
                    stroke="var(--border-md)"
                    strokeDasharray="2 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="var(--purple)"
                    strokeWidth={1.5}
                    dot={false}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trade log */}
          {result.trades.length > 0 && strategy !== "buyhold" && (
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-base)",
                  color: "var(--text2)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Trade Log ({result.trades.length} signals)
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {result.trades.slice(0, 50).map((trade, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 100px 120px 1fr",
                      gap: 12,
                      padding: "8px 16px",
                      alignItems: "center",
                      borderBottom:
                        i < result.trades.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      background:
                        trade.type === "buy"
                          ? "rgba(34,197,94,0.03)"
                          : "rgba(244,63,94,0.03)",
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background:
                          trade.type === "buy"
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(244,63,94,0.12)",
                        color:
                          trade.type === "buy" ? "var(--green)" : "var(--red)",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        width: "fit-content",
                      }}
                    >
                      {trade.type}
                    </span>
                    <span
                      style={{
                        color: "var(--text3)",
                        fontSize: 11,
                        fontFamily: "var(--ff-mono)",
                      }}
                    >
                      {trade.date}
                    </span>
                    <span
                      style={{
                        color: "var(--text1)",
                        fontSize: 12,
                        fontFamily: "var(--ff-mono)",
                        fontWeight: 600,
                      }}
                    >
                      $
                      {trade.price.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {trade.returnPct !== undefined && (
                      <span
                        style={{
                          color:
                            trade.returnPct >= 0
                              ? "var(--green)"
                              : "var(--red)",
                          fontFamily: "var(--ff-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {trade.returnPct >= 0 ? "+" : ""}
                        {trade.returnPct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            color: "var(--text3)",
            fontSize: 14,
          }}
        >
          Configure your strategy above and click Run Backtest
        </div>
      )}

      {loading && (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            color: "var(--text3)",
            fontSize: 14,
          }}
        >
          Running backtest...
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          padding: "10px 16px",
          borderRadius: 10,
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
          color: "var(--text4)",
          fontSize: 11,
        }}
      >
        ⚠️ Past performance does not guarantee future results. This backtester
        does not account for slippage, exchange fees, or liquidity constraints.
        For educational purposes only.
      </div>
    </div>
  );
}

function ResultCard({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "14px 18px",
      }}
    >
      <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "var(--ff-mono)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: "var(--text4)", fontSize: 11, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ParamInput({ label, value, min, max, onChange }) {
  return (
    <div>
      <label
        style={{
          color: "var(--text3)",
          fontSize: 11,
          fontWeight: 600,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: "var(--blue)" }}
      />
    </div>
  );
}
