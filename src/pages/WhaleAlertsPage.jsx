import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Waves, RefreshCw } from "lucide-react";

const FILTERS = ["All", "BTC", "ETH", "USDT", "BNB", "SOL"];
const TYPE_FILTERS = [
  "All Types",
  "transfer",
  "exchange_deposit",
  "exchange_withdrawal",
  "mint",
  "burn",
];

const COIN_IMAGES = {
  BTC: "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/thumb/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/thumb/usdc.png",
  BNB: "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png",
  MATIC:
    "https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png",
  LINK: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png",
};

export default function WhaleAlertsPage() {
  usePageTitle("Whale Alerts");

  const [txns, setTxns] = useState([]);
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [paused, setPaused] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const counterRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const initial = Array.from({ length: 20 }, (_, i) =>
      generateWhaleTransaction(i),
    ).sort((a, b) => b.timestamp - a.timestamp);

    setTxns(initial);
    counterRef.current = 20;
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => {
        if (paused) return;

        const txn = generateWhaleTransaction(counterRef.current++);
        txn.timestamp = Date.now();

        setTxns((prev) => [txn, ...prev].slice(0, 100));
        setNewCount((n) => n + 1);
      },
      Math.random() * 4000 + 4000,
    );

    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const filtered = txns
    .filter((t) => filter === "All" || t.symbol === filter)
    .filter((t) => typeFilter === "All Types" || t.type === typeFilter);

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-[10px]">
          <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center bg-[rgba(61,142,248,0.12)]">
            <Waves size={18} className="text-[var(--blue)]" />
          </div>

          <div>
            <h1 className="text-[22px] font-bold text-[var(--text1)] font-[var(--ff-display)]">
              Whale Alerts
            </h1>

            <p className="text-[13px] text-[var(--text3)] mt-[2px]">
              Large crypto transactions in real time · simulated feed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-[6px]">
            <div
              className="w-[7px] h-[7px] rounded-full"
              style={{
                background: paused ? "var(--text4)" : "var(--green)",
                boxShadow: paused ? "none" : "0 0 6px var(--green)",
                animation: paused ? "none" : "pulse 2s infinite",
              }}
            />

            <span className="text-[12px] font-semibold text-[var(--text3)]">
              {paused ? "Paused" : "Live"}
            </span>
          </div>

          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[8px] border border-[var(--border-md)] text-[12px] font-semibold"
            style={{
              background: paused ? "var(--blue)" : "transparent",
              color: paused ? "#fff" : "var(--text2)",
            }}
          >
            <RefreshCw size={12} />
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[10px] mb-4">
        {[
          { label: "Total Transactions", value: txns.length },
          {
            label: "Total Volume",
            value: fmtUsd(txns.reduce((s, t) => s + t.usdValue, 0)),
          },
          {
            label: "Largest Tx",
            value: fmtUsd(Math.max(...txns.map((t) => t.usdValue))),
          },
          { label: "New (this session)", value: newCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[12px] px-[16px] py-[12px]"
          >
            <div className="text-[11px] text-[var(--text3)] mb-[4px]">
              {label}
            </div>

            <div className="text-[18px] font-bold font-[var(--ff-mono)] text-[var(--text1)]">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-[6px] mb-[10px]">
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f}
            active={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}

        <div className="w-[1px] bg-[var(--border)] mx-[4px]" />

        {TYPE_FILTERS.map((f) => (
          <FilterChip
            key={f}
            label={f === "All Types" ? "All Types" : getTypeLabel(f)}
            active={typeFilter === f}
            onClick={() => setTypeFilter(f)}
            small
          />
        ))}
      </div>

      {/* Transactions */}
      <div className="flex flex-col gap-[4px]">
        {filtered.map((txn, i) => (
          <WhaleTxRow key={txn.id} txn={txn} isNew={i === 0 && !paused} />
        ))}
      </div>
    </div>
  );
}

function WhaleTxRow({ txn, isNew }) {
  const { color, bg } = getTypeColor(txn.type);
  const { label: sizeLabel, color: sizeColor } = getSizeLabel(txn.usdValue);

  return (
    <div
      className="grid items-center gap-[12px] px-[16px] py-[12px] rounded-[12px] border"
      style={{
        gridTemplateColumns: "36px 80px 1fr 1fr 1fr 90px 70px",
        background: "var(--bg-elevated)",
        borderColor: isNew ? "rgba(61,142,248,0.3)" : "var(--border)",
      }}
    >
      <img
        src={COIN_IMAGES[txn.symbol]}
        className="w-[36px] h-[36px] rounded-full"
      />

      <div>
        <div className="font-extrabold text-[15px] text-[var(--text1)] font-[var(--ff-mono)]">
          {fmtUsd(txn.usdValue)}
        </div>

        <div
          className="text-[10px] font-semibold mt-[2px]"
          style={{ color: sizeColor }}
        >
          {sizeLabel}
        </div>
      </div>

      <div className="text-[13px] font-[var(--ff-mono)] text-[var(--text2)]">
        {fmtAmount(txn.amount, txn.symbol)}
      </div>

      <div className="flex items-center gap-[6px] min-w-0">
        <span className="text-[11px] text-[var(--text3)] truncate max-w-[100px]">
          {txn.from}
        </span>

        <span className="text-[11px] text-[var(--text4)]">→</span>

        <span className="text-[11px] text-[var(--text3)] truncate max-w-[100px]">
          {txn.to}
        </span>
      </div>

      <div className="text-[11px] text-[var(--text4)] font-[var(--ff-mono)]">
        {txn.hash}
      </div>

      <div
        className="text-[11px] font-bold px-[10px] py-[4px] rounded-full text-center"
        style={{ color, background: bg }}
      >
        {getTypeLabel(txn.type)}
      </div>

      <div className="text-[11px] text-[var(--text3)] font-[var(--ff-mono)] text-right">
        {fmtTime(txn.timestamp)}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, small }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border font-semibold whitespace-nowrap"
      style={{
        padding: small ? "4px 10px" : "5px 12px",
        borderColor: active ? "var(--blue)" : "var(--border)",
        background: active ? "rgba(61,142,248,0.10)" : "transparent",
        color: active ? "var(--blue)" : "var(--text3)",
        fontSize: small ? 11 : 12,
      }}
    >
      {label}
    </button>
  );
}

/* ---------- Helpers ---------- */

function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtAmount(amount, symbol) {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B ${symbol}`;
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M ${symbol}`;
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K ${symbol}`;
  return `${amount.toFixed(2)} ${symbol}`;
}

function fmtTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function getTypeColor(type) {
  switch (type) {
    case "exchange_deposit":
      return { color: "var(--red)", bg: "rgba(244,63,94,0.10)" };
    case "exchange_withdrawal":
      return { color: "var(--green)", bg: "rgba(34,197,94,0.10)" };
    case "mint":
      return { color: "var(--purple)", bg: "rgba(168,85,247,0.10)" };
    case "burn":
      return { color: "var(--gold)", bg: "rgba(245,158,11,0.10)" };
    default:
      return { color: "var(--blue)", bg: "rgba(61,142,248,0.10)" };
  }
}

function getTypeLabel(type) {
  switch (type) {
    case "exchange_deposit":
      return "→ Exchange";
    case "exchange_withdrawal":
      return "← Withdrawal";
    case "mint":
      return "✦ Mint";
    case "burn":
      return "🔥 Burn";
    default:
      return "⇄ Transfer";
  }
}

function getSizeLabel(usdValue) {
  if (usdValue >= 100e6)
    return { label: "🐋 Mega Whale", color: "var(--purple)" };
  if (usdValue >= 50e6) return { label: "🐋 Whale", color: "var(--blue)" };
  return { label: "🐬 Large", color: "var(--text3)" };
}

function generateWhaleTransaction(id) {
  const symbols = [
    "BTC",
    "ETH",
    "USDT",
    "USDC",
    "BNB",
    "SOL",
    "XRP",
    "MATIC",
    "AVAX",
    "LINK",
  ];
  const types = [
    "transfer",
    "mint",
    "burn",
    "exchange_deposit",
    "exchange_withdrawal",
  ];
  const exchanges = [
    "Binance",
    "Coinbase",
    "Kraken",
    "OKX",
    "Bybit",
    "Unknown Wallet",
  ];

  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const type = types[Math.floor(Math.random() * types.length)];

  const prices = {
    BTC: 65000,
    ETH: 3200,
    USDT: 1,
    USDC: 1,
    BNB: 580,
    SOL: 145,
    XRP: 0.52,
    MATIC: 0.85,
    AVAX: 38,
    LINK: 14,
  };

  const price = prices[symbol] || 1;

  const usdValue = (Math.random() * 190 + 10) * 1e6;
  const amount = usdValue / price;

  const from =
    Math.random() > 0.5
      ? exchanges[Math.floor(Math.random() * exchanges.length)]
      : "Unknown Wallet";

  const to =
    Math.random() > 0.5
      ? exchanges[Math.floor(Math.random() * exchanges.length)]
      : "Unknown Wallet";

  return {
    id,
    symbol,
    type,
    amount,
    usdValue,
    from,
    to,
    timestamp: Date.now(),
    hash: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 8)}`,
  };
}
