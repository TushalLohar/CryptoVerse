import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";

import { useMarketData } from "../hooks/useMarketData";
import { useLivePrices } from "../hooks/useLivePrices";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";
import { useWatchlist } from "../store/watchlistStore";

const PER_PAGE = 25;

// ───────────── Formatters ─────────────

function fmtPrice(price, currency) {
  if (price == null) return "—";

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`;
}

function fmtLarge(n, currency) {
  if (!n) return "—";

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;

  return `${sym}${n.toLocaleString()}`;
}

// ───────────── Page ─────────────

export default function MarketPage() {
  const [page, setPage] = useState(1);
  const { currency } = useCurrency();
  const navigate = useNavigate();

  const { coins, loading, error } = useMarketData({
    page,
    perPage: PER_PAGE,
    currency,
  });

  const livePrices = useLivePrices(currency === "usd" ? coins : []);

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > 20) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error)
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Error: {error}
      </div>
    );

  return (
    <div className="animate-in fade-in duration-500 max-w-400 mx-auto px-4 pb-20">
      <h1 className="text-text-1 text-[24px] font-bold font-display mb-8 mt-8 px-2">
        Market Overview
      </h1>

      {/* Header */}

      <div className="grid grid-cols-[40px_35px_1.5fr_120px_80px_80px_80px_140px_140px_130px] gap-4 px-6 mb-4 items-center text-[11px] font-bold text-text-3 uppercase tracking-wider opacity-50">
        <span>#</span>
        <span />
        <span>Coin</span>
        <span className="text-right">Price</span>
        <span className="text-right">1h</span>
        <span className="text-right">24h</span>
        <span className="text-right">7d</span>
        <span className="text-right">24h Volume</span>
        <span className="text-right">Market Cap</span>
        <span className="text-center">Last 7 Days</span>
      </div>

      {/* Rows */}

      <div className="flex flex-col gap-1">
        {loading
          ? Array.from({ length: PER_PAGE }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          : coins.map((coin) => (
              <CoinRow
                key={`${coin.id}-${currency}`}
                coin={coin}
                currency={currency}
                livePrice={livePrices[coin.id]}
                onClick={() => navigate(`/coin/${coin.id}`)}
              />
            ))}
      </div>

      {/* Pagination */}

      <div className="flex justify-center mt-10">
        <div className="flex items-center gap-1 bg-bg-elevated p-1 rounded-xl border border-border">
          <PaginationBtn
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </PaginationBtn>

          {getPageNumbers(page).map((p) => (
            <PaginationBtn
              key={p}
              onClick={() => goToPage(p)}
              active={p === page}
            >
              {p}
            </PaginationBtn>
          ))}

          <PaginationBtn
            onClick={() => goToPage(page + 1)}
            disabled={page >= 20}
          >
            <ChevronRight size={16} />
          </PaginationBtn>
        </div>
      </div>
    </div>
  );
}

// ───────────── Row ─────────────

function CoinRow({ coin, currency, livePrice, onClick }) {
  const [flash, setFlash] = useState(null);
  const prevPriceRef = useRef(null);

  const currentPrice =
    currency === "usd" && livePrice ? livePrice : coin.current_price;

  const p1h = coin.price_change_percentage_1h_in_currency;
  const p24h = coin.price_change_percentage_24h;
  const p7d = coin.price_change_percentage_7d_in_currency;

  useEffect(() => {
    if (currency !== "usd") {
      prevPriceRef.current = null;
      return;
    }

    let timer;
    if (livePrice != null && prevPriceRef.current != null) {
      if (livePrice > prevPriceRef.current) {
        requestAnimationFrame(() => setFlash("up"));
      }
      if (livePrice < prevPriceRef.current) {
        requestAnimationFrame(() => setFlash("down"));
      }

      timer = setTimeout(() => setFlash(null), 800);
    }

    prevPriceRef.current = livePrice ?? coin.current_price;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [livePrice, currency, coin.current_price]);

  return (
    <div
      onClick={onClick}
      className={`grid grid-cols-[40px_35px_1.5fr_120px_80px_80px_80px_140px_140px_130px] gap-4 items-center px-6 py-4 rounded-xl border transition-all duration-200 cursor-pointer
      ${
        flash === "up"
          ? "bg-green-500/5 border-green-500/30"
          : flash === "down"
            ? "bg-red-500/5 border-red-500/30"
            : "bg-bg-elevated border-border hover:bg-bg-hover hover:border-border-md"
      }`}
    >
      <div className="flex items-center gap-2">
        <WatchStar coinId={coin.id} />
        <span className="text-text-4 text-[12px] font-mono">
          {coin.market_cap_rank}
        </span>
      </div>

      <img src={coin.image} alt="" className="w-7 h-7 rounded-full" />

      <div className="flex items-center gap-2 min-w-0">
        <span className="text-text-1 font-bold text-[14px] truncate">
          {coin.name}
        </span>

        <span className="text-text-3 text-[10px] font-mono uppercase opacity-60">
          {coin.symbol}
        </span>
      </div>

      <div
        className={`text-right font-mono font-bold text-[14px]
        ${
          flash === "up"
            ? "text-green-500"
            : flash === "down"
              ? "text-red-500"
              : "text-text-1"
        }`}
      >
        {fmtPrice(currentPrice, currency)}
      </div>

      <PercentCell val={p1h} />
      <PercentCell val={p24h} />
      <PercentCell val={p7d} />

      <div className="text-right font-mono text-[13px] text-text-2">
        {fmtLarge(coin.total_volume, currency)}
      </div>

      <div className="text-right font-mono text-[13px] text-text-2">
        {fmtLarge(coin.market_cap, currency)}
      </div>

      <div className="h-8.75 w-full pl-4">
        <SparklineView
          data={coin.sparkline_in_7d?.price}
          isUp={p7d >= 0}
          coinId={coin.id}
        />
      </div>
    </div>
  );
}

// ───────────── Percent Cell ─────────────

function PercentCell({ val }) {
  if (val == null) return <div className="text-right text-text-4">—</div>;

  const isUp = val >= 0;

  return (
    <div
      className={`text-right font-mono text-[13px] font-bold
      ${isUp ? "text-green-500" : "text-red-500"}`}
    >
      {isUp ? "▲" : "▼"}
      {Math.abs(val).toFixed(1)}%
    </div>
  );
}

// ───────────── Sparkline ─────────────

const SparklineView = React.memo(function SparklineView({
  data,
  isUp,
  coinId,
}) {
  const chartData = useMemo(
    () =>
      data
        ? data.map((v, i) => ({
            i,
            p: v,
          }))
        : [],
    [data],
  );

  if (!data) return null;

  const color = isUp ? "#22c55e" : "#f43f5e";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`g-${coinId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <YAxis hide domain={["auto", "auto"]} />

        <Area
          type="monotone"
          dataKey="p"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#g-${coinId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

// ───────────── Components ─────────────

function PaginationBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all
      ${
        active
          ? "bg-blue text-white shadow-lg"
          : disabled
            ? "opacity-20"
            : "text-text-2 hover:bg-bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

function WatchStar({ coinId }) {
  const { toggle, has } = useWatchlist();

  const isWatched = has(coinId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle(coinId);
      }}
      className="hover:scale-110 transition-transform"
    >
      <Star
        size={14}
        fill={isWatched ? "#eab308" : "none"}
        color={isWatched ? "#eab308" : "#666"}
      />
    </button>
  );
}

function getPageNumbers(current) {
  const total = 20;
  const delta = 2;

  let start = Math.max(1, current - delta);
  let end = Math.min(total, current + delta);

  const pages = [];

  for (let i = start; i <= end; i++) pages.push(i);

  return pages;
}

function SkeletonRow() {
  return (
    <div className="h-15 w-full bg-bg-elevated animate-pulse rounded-xl border border-border" />
  );
}
