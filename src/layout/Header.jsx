import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart2,
  ChevronDown,
  Search,
  X,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";
import { useTheme } from "../context/ThemeContext";
import { fetchSearch } from "../utils/marketAPI";

const PRIMARY_NAV = [
  { to: "/", label: "Markets" },
  { to: "/trending", label: "Trending" },
  { to: "/gainers", label: "Movers" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/ai", label: "AI Chat" },
];

const MORE_NAV = [
  { to: "/alerts", label: "🔔 Alerts" },
  { to: "/compare", label: "⚖️ Compare" },
  { to: "/screener", label: "🔍 Screener" },
  { to: "/heatmap", label: "🟩 Heatmap" },
  { to: "/whale-alerts", label: "🐋 Whales" },
  { to: "/gas", label: "⛽ Gas Tracker" },
  { to: "/onchain", label: "🔗 On-Chain" },
  { to: "/defi", label: "🏦 DeFi" },
  { to: "/order-book", label: "📊 Order Book" },
  { to: "/arbitrage", label: "💱 Arbitrage" },
  { to: "/game", label: "🎮 Game" },
  { to: "/backtest", label: "📈 Backtest" },
];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const { theme, toggleTheme } = useTheme();

  const [moreOpen, setMoreOpen] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef(null);
  const currencyRef = useRef(null);

  const activeCurrency = CURRENCIES.find((c) => c.code === currency);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target))
        setShowCurrency(false);
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowResults(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setShowResults(true);
      try {
        const { data } = await fetchSearch(query);
        setResults((data?.coins || []).slice(0, 8));
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="fixed top-0 left-0 right-0 h-13 bg-bg-elevated/80 backdrop-blur-md border-b border-border-md z-100 transition-all">
      <div className="max-w-350 mx-auto h-full px-5 flex items-center gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-4 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-crypto-blue flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
            <BarChart2 size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-text-1 font-display font-extrabold text-[13px] tracking-widest uppercase">
            CryptoTracker
          </span>
        </Link>

        {/* Primary Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {PRIMARY_NAV.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              active={location.pathname === link.to}
            >
              {link.label}
            </NavLink>
          ))}

          {/* More Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                moreOpen || MORE_NAV.some((n) => n.to === location.pathname)
                  ? "text-crypto-blue bg-crypto-blue/10"
                  : "text-text-2 hover:bg-bg-hover hover:text-text-1"
              }`}
            >
              More
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>

            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute top-[calc(100%+8px)] left-0 min-w-55 bg-bg-elevated border border-border-md rounded-xl p-1.5 shadow-premium grid grid-cols-2 gap-1 z-50 animate-scale-in">
                  {MORE_NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        location.pathname === item.to
                          ? "bg-crypto-blue/10 text-crypto-blue"
                          : "text-text-2 hover:bg-bg-hover hover:text-text-1"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Search Bar */}
        <div ref={searchRef} className="relative ml-auto w-60 group">
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-3 text-text-3 group-focus-within:text-crypto-blue transition-colors"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowResults(true)}
              placeholder="Search coins..."
              className="w-full h-8 pl-9 pr-8 bg-bg-base border border-border-md rounded-lg text-[13px] text-text-1 outline-none focus:border-crypto-blue transition-all"
            />
            <div className="absolute right-2.5 flex items-center">
              {searching ? (
                <Loader2 size={13} className="text-crypto-blue animate-spin" />
              ) : (
                query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-text-3 hover:text-text-1"
                  >
                    <X size={13} />
                  </button>
                )
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-[calc(100%+6px)] inset-x-0 bg-bg-elevated border border-border-md rounded-xl shadow-premium overflow-hidden animate-scale-in z-200">
              {results.length > 0
                ? results.map((coin) => (
                    <button
                      key={coin.id}
                      onClick={() => {
                        navigate(`/coin/${coin.id}`);
                        setShowResults(false);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors text-left"
                    >
                      <img
                        src={coin.thumb}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-text-1">
                          {coin.name}
                        </span>
                        <span className="text-[10px] font-mono text-text-3 uppercase">
                          {coin.symbol}
                        </span>
                      </div>
                      {coin.market_cap_rank && (
                        <span className="ml-auto text-[11px] font-mono text-text-4">
                          #{coin.market_cap_rank}
                        </span>
                      )}
                    </button>
                  ))
                : !searching && (
                    <div className="p-4 text-center text-[13px] text-text-3">
                      No results for "{query}"
                    </div>
                  )}
            </div>
          )}
        </div>

        {/* Currency Switcher */}
        <div ref={currencyRef} className="relative ml-2">
          <button
            onClick={() => setShowCurrency(!showCurrency)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border-md text-text-2 font-mono text-xs font-semibold hover:bg-bg-hover hover:text-text-1 transition-all"
          >
            {activeCurrency.symbol} {activeCurrency.label}
            <ChevronDown
              size={12}
              className={`transition-transform ${showCurrency ? "rotate-180" : ""}`}
            />
          </button>

          {showCurrency && (
            <div className="absolute top-[calc(100%+8px)] right-0 min-w-35 bg-bg-elevated border border-border-md rounded-xl shadow-premium overflow-hidden animate-scale-in z-200">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    setShowCurrency(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-medium transition-colors ${
                    currency === c.code
                      ? "bg-crypto-blue/10 text-crypto-blue"
                      : "text-text-2 hover:bg-bg-hover"
                  }`}
                >
                  <span className="flex gap-2">
                    <span className="font-mono w-4">{c.symbol}</span>
                    {c.label}
                  </span>
                  {currency === c.code && (
                    <span className="text-[10px]">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-md text-text-2 hover:bg-bg-hover hover:text-text-1 transition-all ml-1"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
        active
          ? "bg-crypto-blue/10 text-crypto-blue"
          : "text-text-2 hover:bg-bg-hover hover:text-text-1"
      }`}
    >
      {children}
    </Link>
  );
}
