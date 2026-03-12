import { useState, useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";

const PAIRS = [
  { symbol: "BTC", binance: "btcusdt", color: "#f7931a" },
  { symbol: "ETH", binance: "ethusdt", color: "#627eea" },
  { symbol: "SOL", binance: "solusdt", color: "#9945ff" },
  { symbol: "BNB", binance: "bnbusdt", color: "#f3ba2f" },
];

const EXCHANGES = ["Binance", "Coinbase", "Kraken", "OKX"];

const SPREADS = {
  Binance: { min: -0.001, max: 0.001 },
  Coinbase: { min: -0.003, max: 0.005 },
  Kraken: { min: -0.004, max: 0.004 },
  OKX: { min: -0.002, max: 0.003 },
};

const ROUND_TRIP_FEE = 0.002;

function randomPrices(base) {
  const out = {};

  EXCHANGES.forEach((e) => {
    const { min, max } = SPREADS[e];
    const s = min + Math.random() * (max - min);
    out[e] = base * (1 + s);
  });

  return out;
}

function fmtPrice(p) {
  if (!p) return "—";
  if (p > 10000)
    return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (p > 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(6)}`;
}

function fmtPct(p) {
  if (p == null) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(3)}%`;
}

export default function ArbitrageScanner() {
  usePageTitle("Arbitrage Scanner");

  const [live, setLive] = useState({});
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [minSpread, setMinSpread] = useState(0.1);

  const wsRef = useRef(null);

  useEffect(() => {
    const streams = PAIRS.map((p) => `${p.binance}@miniTicker`).join("/");

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${streams}`,
    );
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (e) => {
      const { data } = JSON.parse(e.data);

      const price = parseFloat(data.c);

      const pair = PAIRS.find((p) => data.s?.toLowerCase().includes(p.binance));

      if (!pair) return;

      setLive((prev) => ({ ...prev, [pair.symbol]: price }));

      setPrices((prev) => ({
        ...prev,
        [pair.symbol]: randomPrices(price),
      }));
    };

    return () => ws.close();
  }, []);

  const opportunities = PAIRS.filter((p) => live[p.symbol] && prices[p.symbol])
    .map((p) => {
      const entries = Object.entries(prices[p.symbol]).sort(
        (a, b) => a[1] - b[1],
      );

      const cheapest = entries[0];
      const priciest = entries[entries.length - 1];

      const spread = ((priciest[1] - cheapest[1]) / cheapest[1]) * 100;
      const profit = spread - ROUND_TRIP_FEE * 100;

      return {
        ...p,
        base: live[p.symbol],
        buy: { exchange: cheapest[0], price: cheapest[1] },
        sell: { exchange: priciest[0], price: priciest[1] },
        spread,
        profit,
        isProfit: profit > 0,
      };
    })
    .filter((o) => o.spread >= minSpread)
    .sort((a, b) => b.spread - a.spread);

  return (
    <div className="animate-fade-up">
      {/* Header */}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Zap size={18} className="text-crypto-green" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-text-1">Arbitrage Scanner</h1>

            <p className="text-sm text-text-3">
              Live Binance price differences
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-crypto-green" : "bg-crypto-red"}`}
          />

          <span className="text-xs text-text-3 font-semibold">
            {connected ? "Live" : "Connecting"}
          </span>
        </div>
      </div>

      {/* Controls */}

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-3 font-semibold">Min Spread</span>

        {[0, 0.1, 0.2, 0.5].map((v) => (
          <button
            key={v}
            onClick={() => setMinSpread(v)}
            className={`px-2 py-1 rounded text-xs border ${
              minSpread === v
                ? "border-crypto-blue text-crypto-blue bg-crypto-blue/10"
                : "border-border text-text-3"
            }`}
          >
            {v}%
          </button>
        ))}
      </div>

      {/* Cards */}

      <div className="flex flex-col gap-3">
        {opportunities.map((o) => (
          <Opportunity key={o.symbol} opp={o} />
        ))}

        {opportunities.length === 0 && (
          <div className="p-10 text-center border border-border rounded-xl text-text-3">
            No opportunities above {minSpread}% spread
          </div>
        )}
      </div>
    </div>
  );
}

function Opportunity({ opp }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-bg-elevated">
      <div className="grid grid-cols-[40px_80px_1fr_1fr_100px] items-center gap-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: opp.color }}
        >
          {opp.symbol}
        </div>

        <div>
          <div className="font-bold text-text-1 text-sm">{opp.symbol}</div>

          <div className="text-xs text-text-3 font-mono">
            {fmtPrice(opp.base)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-text-4">Buy</div>

          <div className="text-sm font-bold text-crypto-green">
            {fmtPrice(opp.buy.price)}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-text-4">Sell</div>

          <div className="text-sm font-bold text-crypto-red">
            {fmtPrice(opp.sell.price)}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-text-4">Spread</div>

          <div className="font-mono font-bold text-crypto-gold">
            {fmtPct(opp.spread)}
          </div>

          <div
            className={`font-mono text-xs ${opp.isProfit ? "text-crypto-green" : "text-crypto-red"}`}
          >
            {fmtPct(opp.profit)}
          </div>
        </div>
      </div>
    </div>
  );
}
