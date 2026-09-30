import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import { Star } from "lucide-react"
import { fetchMarkets } from "../utils/marketAPI"
import { useCurrency, CURRENCIES } from "../context/CurrencyContext"
import { useWatchlist } from "../store/watchlistStore"

function fmtPrice(price, currency) {
  if (price == null) return "—"
  if (currency === "btc") return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === "eth") return `Ξ${price.toFixed(price < 0.01 ? 6 : 4)}`
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol || "$"

  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

const TABS = [
  { key: "gainers", label: "Top Gainers", icon: TrendingUp },
  { key: "losers", label: "Top Losers", icon: TrendingDown },
]

export default function GainersPage() {
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("gainers")

  const { currency } = useCurrency()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const [page1, page2] = await Promise.all([
        fetchMarkets({ page: 1, perPage: 100, currency }),
        fetchMarkets({ page: 2, perPage: 100, currency }),
      ])

      if (page1.error) {
        setError(page1.error)
        setLoading(false)
        return
      }

      const all = [...(page1.data || []), ...(page2.data || [])]

      setCoins(all)
      setLoading(false)
    }

    load()
  }, [currency])

  const sorted = [...coins].sort((a, b) => {
    const aChange = a.price_change_percentage_24h ?? 0
    const bChange = b.price_change_percentage_24h ?? 0

    return activeTab === "gainers" ? bChange - aChange : aChange - bChange
  })

  const displayed = sorted.slice(0, 25)

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">

      {/* Header */}

      <div className="flex items-center gap-[10px] mb-6">

        <div className="w-9 h-9 rounded-[10px] bg-[rgba(61,142,248,0.12)] flex items-center justify-center">
          <ArrowUpDown size={18} className="text-[var(--blue)]" />
        </div>

        <div>
          <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">
            Movers
          </h1>

          <p className="text-[var(--text3)] text-[13px] mt-[2px]">
            Top gainers and losers in the last 24h
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Tabs */}

      <div className="flex gap-[4px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[10px] p-[4px] mb-5 w-fit">

        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key

          return (
            <TabBtn
              key={tab.key}
              label={tab.label}
              icon={<Icon size={14} />}
              active={isActive}
              color={tab.key === "gainers" ? "var(--green)" : "var(--red)"}
              onClick={() => setActiveTab(tab.key)}
            />
          )
        })}
      </div>

      {/* Headers */}

      <div className="grid grid-cols-[24px_32px_1fr_120px_90px_32px] gap-[14px] px-[18px] pb-[8px] items-center">

        <span className="text-[var(--text3)] text-[11px] font-semibold">#</span>
        <span />

        <span className="text-[var(--text3)] text-[11px] font-semibold">
          Name
        </span>

        <span className="text-[var(--text3)] text-[11px] font-semibold text-right">
          Price
        </span>

        <span
          className={`text-[11px] font-semibold text-right ${
            activeTab === "gainers"
              ? "text-[var(--green)]"
              : "text-[var(--red)]"
          }`}
        >
          24h %
        </span>

        <span />
      </div>

      {/* Rows */}

      <div className="flex flex-col gap-[4px]">

        {loading
          ? Array.from({ length: 25 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))
          : displayed.map((coin, index) => (
              <MoverRow
                key={coin.id}
                coin={coin}
                rank={index + 1}
                currency={currency}
              />
            ))}
      </div>
    </div>
  )
}

function TabBtn({ label, icon, active, color, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center gap-[6px] px-[16px] py-[7px] rounded-[8px] text-[13px] font-semibold transition-all
      ${
        active
          ? "bg-[var(--bg-hover)]"
          : hovered
          ? "bg-[var(--bg-base)]"
          : "bg-transparent"
      }`}
      style={{ color: active ? color : "var(--text3)" }}
    >
      {icon}
      {label}
    </button>
  )
}

function MoverRow({ coin, rank, currency }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const { toggle, has } = useWatchlist()

  const isWatched = has(coin.id)

  const change = coin.price_change_percentage_24h
  const isUp = change >= 0

  return (
    <div
      onClick={() => navigate(`/coin/${coin.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="grid grid-cols-[24px_32px_1fr_120px_90px_32px] gap-[14px] px-[18px] py-[11px] items-center rounded-[12px] cursor-pointer transition-all"
      style={{
        background: hovered ? "var(--bg-hover)" : "var(--bg-elevated)",
        border: `1px solid ${
          hovered ? "var(--border-md)" : "var(--border)"
        }`,
      }}
    >
      <span className="text-[var(--text4)] text-[11px] font-[var(--ff-mono)]">
        {rank}
      </span>

      <img
        src={coin.image}
        alt={coin.name}
        className="w-8 h-8 rounded-full"
      />

      <div>
        <div className="text-[var(--text1)] font-semibold text-[14px]">
          {coin.name}
        </div>

        <div className="text-[var(--text3)] text-[11px] font-[var(--ff-mono)] uppercase mt-[2px]">
          {coin.symbol}
        </div>
      </div>

      <div className="text-[var(--text1)] font-[var(--ff-mono)] font-semibold text-[14px] text-right">
        {fmtPrice(coin.current_price, currency)}
      </div>

      <div
        className={`font-[var(--ff-mono)] font-bold text-[14px] text-right px-[10px] py-[4px] rounded-[8px]
        ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}
        style={{
          background: isUp
            ? "rgba(34,197,94,0.12)"
            : "rgba(244,63,94,0.12)",
        }}
      >
        {isUp ? "+" : ""}
        {change?.toFixed(2)}%
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle(coin.id)
        }}
        className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px]"
      >
        <Star
          size={13}
          fill={isWatched ? "var(--gold)" : "none"}
          color={isWatched ? "var(--gold)" : "var(--text4)"}
        />
      </button>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[24px_32px_1fr_120px_90px_32px] gap-[14px] px-[18px] py-[11px] items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[12px]">

      <Shimmer width={16} height={12} />
      <Shimmer width={32} height={32} radius="50%" />

      <div>
        <Shimmer width={120} height={13} />
        <Shimmer width={50} height={10} className="mt-[5px]" />
      </div>

      <Shimmer width={80} height={13} className="ml-auto" />
      <Shimmer width={65} height={26} className="ml-auto rounded-[8px]" />
      <Shimmer width={28} height={28} radius={6} />
    </div>
  )
}

function Shimmer({ width, height, radius = 4, className = "" }) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg,var(--bg-hover)25%,var(--bg-elevated)50%,var(--bg-hover)75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  )
}