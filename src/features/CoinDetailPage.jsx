import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Star } from "lucide-react";

import { fetchCoinDetail } from "../utils/marketAPI";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";
import { useWatchlist } from "../store/watchlistStore";
import { usePageTitle } from "../hooks/usePageTitle";
import CandlestickChart from "../components/CandlestickChart";

function fmtPrice(price, currency) {
  if (price == null) return "—";

  if (currency === "btc") return "₿" + price.toFixed(4);
  if (currency === "eth") return "Ξ" + price.toFixed(4);

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  return (
    sym +
    price.toLocaleString(undefined, {
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    })
  );
}

function fmtLarge(n, currency) {
  if (!n) return "—";

  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  if (n >= 1e12) return sym + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return sym + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return sym + (n / 1e6).toFixed(2) + "M";

  return sym + n.toLocaleString();
}

function fmtPct(n) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export default function CoinDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { currency } = useCurrency();
  const { toggle, has } = useWatchlist();

  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageTitle(coin ? coin.name : null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await fetchCoinDetail(id);

      if (error) setError(error);
      else setCoin(data);

      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) return <LoadingSkeleton />;

  if (error || !coin)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-text-1 text-[16px] font-semibold">
          Could not load coin data
        </p>

        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 rounded-lg bg-blue text-white text-sm font-semibold"
        >
          Back to Markets
        </button>
      </div>
    );

  const md = coin.market_data;
  const price = md?.current_price?.[currency];
  const isWatched = has(coin.id);

  const priceStats = [
    {
      label: "24h High",
      value: fmtPrice(md?.high_24h?.[currency], currency),
      color: "text-green",
    },

    {
      label: "24h Low",
      value: fmtPrice(md?.low_24h?.[currency], currency),
      color: "text-red",
    },

    {
      label: "ATH",
      value: fmtPrice(md?.ath?.[currency], currency),
      color: "text-yellow-400",
    },

    {
      label: "ATL",
      value: fmtPrice(md?.atl?.[currency], currency),
      color: "text-text-2",
    },
  ];

  const marketStats = [
    {
      label: "Market Cap",
      value: fmtLarge(md?.market_cap?.[currency], currency),
    },

    {
      label: "24h Volume",
      value: fmtLarge(md?.total_volume?.[currency], currency),
    },

    {
      label: "Circulating Supply",
      value: md?.circulating_supply
        ? (md.circulating_supply / 1e6).toFixed(2) +
          "M " +
          coin.symbol.toUpperCase()
        : "—",
    },

    {
      label: "Max Supply",
      value: md?.max_supply
        ? (md.max_supply / 1e6).toFixed(2) + "M " + coin.symbol.toUpperCase()
        : "∞",
    },

    {
      label: "Market Cap Rank",
      value: coin.market_cap_rank ? "#" + coin.market_cap_rank : "—",
    },

    {
      label: "Coingecko Rank",
      value: coin.coingecko_rank ? "#" + coin.coingecko_rank : "—",
    },
  ];

  const changes = [
    {
      label: "1h",
      value: md?.price_change_percentage_1h_in_currency?.[currency],
    },
    {
      label: "24h",
      value: md?.price_change_percentage_24h_in_currency?.[currency],
    },
    {
      label: "7d",
      value: md?.price_change_percentage_7d_in_currency?.[currency],
    },
    {
      label: "14d",
      value: md?.price_change_percentage_14d_in_currency?.[currency],
    },
    {
      label: "30d",
      value: md?.price_change_percentage_30d_in_currency?.[currency],
    },
    {
      label: "1y",
      value: md?.price_change_percentage_1y_in_currency?.[currency],
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      {/* Back */}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-5 px-3 py-1 border border-border rounded-lg text-text-3 hover:text-text-1"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Header */}

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <img src={coin.image?.large} className="w-14 h-14 rounded-full" />

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold font-display text-text-1">
              {coin.name}
            </h1>

            <span className="text-text-3 uppercase font-mono">
              {coin.symbol}
            </span>

            {coin.market_cap_rank && (
              <span className="px-2 py-0.5 rounded-full bg-bg-hover text-text-3 text-[11px] font-bold">
                #{coin.market_cap_rank}
              </span>
            )}
          </div>

          {/* Categories */}

          {coin.categories?.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {coin.categories.slice(0, 4).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 rounded-full bg-crypto-blue/10 text-crypto-blue text-[10px] font-semibold"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Watch + Website */}

        <div className="flex gap-2">
          <button
            onClick={() => toggle(coin.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border
          ${
            isWatched
              ? "border-yellow-400 text-yellow-400 bg-yellow-400/10"
              : "border-border-md text-text-3"
          }
          `}
          >
            <Star size={14} />
            {isWatched ? "Watching" : "Watch"}
          </button>

          {coin.links?.homepage?.[0] && (
            <a
              href={coin.links.homepage[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-md text-text-3 hover:text-text-1"
            >
              <ExternalLink size={14} />
              Website
            </a>
          )}
        </div>
      </div>

      {/* Price Section */}

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Price card */}

        <div className="bg-bg-elevated border border-border rounded-xl p-6">
          <div className="text-text-3 text-xs mb-2">Current Price</div>

          <div className="text-text-1 text-[36px] font-bold font-mono">
            {fmtPrice(price, currency)}
          </div>

          <div className="flex gap-4 mt-3 flex-wrap">
            {changes.map((c) => (
              <div key={c.label}>
                <div className="text-text-4 text-[10px]">{c.label}</div>

                <div
                  className={`text-[12px] font-bold font-mono ${
                    c.value >= 0 ? "text-crypto-green" : "text-crypto-red"
                  }`}
                >
                  {fmtPct(c.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price stats */}

        <div className="bg-bg-elevated border border-border rounded-xl p-6 grid grid-cols-2 gap-4">
          {priceStats.map((s) => (
            <div key={s.label}>
              <div className="text-text-3 text-xs">{s.label}</div>

              <div className={`font-bold font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}

      <div className="bg-bg-elevated border border-border rounded-xl p-5 mb-5">
        <CandlestickChart coinId={coin.id} currency={currency} height={380} />
      </div>

      {/* Market Stats */}

      <div className="bg-bg-elevated border border-border rounded-xl p-6 mb-6">
        <div className="text-text-2 text-sm font-bold mb-4">Market Stats</div>

        <div className="grid grid-cols-3 gap-4">
          {marketStats.map((s) => (
            <div
              key={s.label}
              className="p-3 bg-bg-base border border-border rounded-lg"
            >
              <div className="text-text-3 text-xs">{s.label}</div>

              <div className="text-text-1 font-mono font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* About */}

      {coin.description?.en && (
        <div className="bg-bg-elevated border border-border rounded-xl p-6">
          <div className="text-text-2 text-sm font-bold mb-3">
            About {coin.name}
          </div>

          <div
            className="text-text-2 text-sm leading-relaxed max-h-50 overflow-y-auto"
            dangerouslySetInnerHTML={{
              __html: coin.description.en
                .split(". ")
                .slice(0, 8)
                .join(". ")
                .replace(/<a /g, '<a class="text-blue" '),
            }}
          />
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-full bg-bg-hover" />
        <div className="space-y-2">
          <div className="w-52 h-6 bg-bg-hover rounded" />
          <div className="w-32 h-4 bg-bg-hover rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-35 bg-bg-hover rounded-xl" />
        <div className="h-35 bg-bg-hover rounded-xl" />
      </div>

      <div className="h-105 bg-bg-hover rounded-xl" />
      <div className="h-50 bg-bg-hover rounded-xl" />
    </div>
  );
}
