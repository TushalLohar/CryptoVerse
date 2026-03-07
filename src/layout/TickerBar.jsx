import { useState, useEffect, useMemo } from "react";
import { fetchGlobal } from "../utils/marketAPI";
import { TrendingUp, TrendingDown } from "lucide-react";

function fmtLarge(n) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export default function TickerBar() {
  const [global, setGlobal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchGlobal();
      setGlobal(data?.data || null);
      setLoading(false);
    };

    load();

    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const items = useMemo(() => {
    if (!global) return [];

    const totalMcap = global.total_market_cap?.usd;
    const totalVol = global.total_volume?.usd;
    const btcDom = global.market_cap_percentage?.btc;
    const ethDom = global.market_cap_percentage?.eth;
    const mcapChange = global.market_cap_change_percentage_24h_usd;
    const activeCoin = global.active_cryptocurrencies;
    const isUp = mcapChange >= 0;

    return [
      { label: "Market Cap", value: fmtLarge(totalMcap) },
      { label: "24h Volume", value: fmtLarge(totalVol) },
      { label: "BTC Dom", value: `${btcDom?.toFixed(1)}%` },
      { label: "ETH Dom", value: `${ethDom?.toFixed(1)}%` },
      { label: "Active Coins", value: activeCoin?.toLocaleString() },
      {
        label: "24h Change",
        value: `${isUp ? "+" : ""}${mcapChange?.toFixed(2)}%`,
        color: isUp ? "text-crypto-green" : "text-crypto-red",
        icon: isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />,
      },
    ];
  }, [global]);

  if (loading || !global) {
    return (
      <div className="fixed left-0 right-0 top-13 z-99 h-7 border-b border-border bg-bg-base" />
    );
  }

  const duplicated = [...items, ...items, ...items, ...items];

  return (
    <div className="fixed left-0 right-0 top-13 z-99 flex h-7 items-center overflow-hidden border-b border-border bg-bg-base">
      {/* Left Fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-15 bg-linear-to-r from-bg-base to-transparent z-10" />

      {/* Right Fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-15 bg-linear-to-l from-bg-base to-transparent z-10" />

      <div className="ticker-track">
        {duplicated.map((item, i) => (
          <TickerItem key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ item }) {
  return (
    <div className="flex items-center h-7 gap-1 px-7 border-r border-border/60 whitespace-nowrap">
      <span className="text-[11px] font-medium text-text-3">{item.label}</span>

      <span
        className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
          item.color || "text-text-1"
        }`}
      >
        {item.icon}
        {item.value}
      </span>
    </div>
  );
}
