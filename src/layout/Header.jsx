import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart2, ChevronDown, Search, X, Loader2 } from "lucide-react";
import { C } from "../utils/theme";
import { useCurrency, CURRENCIES } from "../context/CurrencyContext";
import { fetchSearch } from "../utils/marketAPI";
import { Sun, Moon } from 'lucide-react'
import { useTheme }  from '../context/ThemeContext'
import { Bell } from "lucide-react";

const PRIMARY_NAV = [
  { to: '/',          label: 'Markets'   },
  { to: '/trending',  label: 'Trending'  },
  { to: '/gainers',   label: 'Movers'    },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/ai',        label: 'AI Chat'   },
]

const MORE_NAV = [
  { to: '/alerts',       label: '🔔 Alerts'     },
  { to: '/compare',      label: '⚖️ Compare'    },
  { to: '/screener',     label: '🔍 Screener'   },
  { to: '/heatmap',      label: '🟩 Heatmap'    },
  { to: '/whale-alerts', label: '🐋 Whales'     },
  { to: '/gas',          label: '⛽ Gas Tracker' },
  { to: '/onchain',      label: '🔗 On-Chain'   },
  { to: '/defi',         label: '🏦 DeFi'       },
  { to: '/order-book',   label: '📊 Order Book' },
  { to: '/arbitrage',    label: '💱 Arbitrage'  },
  { to: '/game',         label: '🎮 Game'        },
  { to: '/backtest',     label: '📈 Backtest'   },
]

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currency, setCurrency } = useCurrency();
  const [moreOpen, setMoreOpen] = useState(false)

  // ── Currency dropdown ──
  const [showCurrency, setShowCurrency] = useState(false);
  const currencyRef = useRef(null);

  // ── Search ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setShowCurrency(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search — waits 350ms after user stops typing
  // Why debounce? Without it: every single keystroke = API call
  // With debounce: only fires 350ms after user pauses typing
  useEffect(() => {
    // If query is too short, don't search
    if (query.length < 2) {
      return;
    }

    // Set a timer — if query changes before 350ms, this timer is cancelled
    const timer = setTimeout(async () => {
      setSearching(true);
      setShowResults(true);
      const { data } = await fetchSearch(query);
      setResults((data?.coins || []).slice(0, 8));
      setSearching(false);
    }, 350);

    // Cleanup — cancel the previous timer on every keystroke and clear results
    return () => {
      clearTimeout(timer);
      setResults([]);
      setShowResults(false);
    };
  }, [query]);

  const activeCurrency = CURRENCIES.find((c) => c.code === currency);

  // When user clicks a search result
  const handleSelect = (coinId) => {
    navigate(`/coin/${coinId}`);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  // Press Escape to close search
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setShowResults(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);
const { theme, toggleTheme } = useTheme()
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        background: C.bgElevated,
        borderBottom: `1px solid ${C.borderMd}`,
        zIndex: 100,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          height: "100%",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            marginRight: 16,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: C.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart2 size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span
            style={{
              color: C.text1,
              fontFamily: "var(--ff-display)",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.1em",
            }}
          >
            CRYPTOTRACKER
          </span>
        </Link>

        {/* Nav */}
        <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2 }}>
  {PRIMARY_NAV.map(({ to, label }) => (
    <NavLink key={to} to={to} isActive={location.pathname === to}>
      {label}
    </NavLink>
  ))}

  {/* More dropdown */}
  <div style={{ position: 'relative' }}>
    <button
      onClick={() => setMoreOpen(o => !o)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        4,
        padding:    '5px 12px',
        borderRadius: 8,
        border:     'none',
        fontSize:   13,
        fontWeight: 600,
        color:      MORE_NAV.some(n => n.to === location.pathname) || moreOpen
          ? C.blue : C.text2,
        background: MORE_NAV.some(n => n.to === location.pathname) || moreOpen
          ? 'rgba(61,142,248,0.10)' : 'transparent',
        cursor:     'pointer',
        transition: 'all 0.15s',
      }}
    >
      More
      <ChevronDown size={12} style={{
        transform:  moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s',
      }} />
    </button>

    {moreOpen && (
      <>
        {/* Backdrop */}
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 49 }}
          onClick={() => setMoreOpen(false)}
        />
        {/* Dropdown */}
        <div style={{
          position:   'absolute',
          top:        'calc(100% + 8px)',
          left:       0,
          background: C.bgElevated,
          border:     `1px solid ${C.borderMd}`,
          borderRadius: 12,
          padding:    6,
          zIndex:     50,
          minWidth:   200,
          boxShadow:  C.shadowLg,
          display:    'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:        2,
          animation:  'scaleIn 0.15s ease-out both',
          transformOrigin: 'top left',
        }}>
          {MORE_NAV.map(({ to, label }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                style={{
                  display:      'block',
                  padding:      '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color:        isActive ? C.blue : C.text2,
                  fontSize:     12,
                  fontWeight:   isActive ? 700 : 500,
                  background:   isActive ? 'rgba(61,142,248,0.08)' : 'transparent',
                  transition:   'all 0.1s',
                  whiteSpace:   'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = C.bgHover
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive
                    ? 'rgba(61,142,248,0.08)' : 'transparent'
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </>
    )}
  </div>
</nav>

        {/* ── Search bar ── */}
        <div
          ref={searchRef}
          style={{ position: "relative", marginLeft: "auto", width: 240 }}
        >
          {/* Input wrapper */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                color: C.text3,
                pointerEvents: "none", // clicks pass through to the input
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowResults(true)}
              placeholder="Search coins…"
              style={{
                width: "100%",
                height: 32,
                padding: "0 32px 0 30px",
                background: C.bgBase,
                border: `1px solid ${C.borderMd}`,
                borderRadius: 8,
                color: C.text1,
                fontSize: 13,
                fontFamily: "var(--ff-body)",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.target.style.borderColor = C.blue)}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target)
                  e.target.style.borderColor = C.borderMd;
              }}
              onFocusCapture={(e) => (e.target.style.borderColor = C.blue)}
              onBlurCapture={(e) => (e.target.style.borderColor = C.borderMd)}
            />

            {/* Right icon: spinner while searching, X to clear when there's text */}
            {searching && (
              <Loader2
                size={13}
                style={{
                  position: "absolute",
                  right: 10,
                  color: C.blue,
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {query && !searching && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setShowResults(false);
                }}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.text3,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showResults && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: C.bgElevated,
                border: `1px solid ${C.borderMd}`,
                borderRadius: 12,
                boxShadow: C.shadowLg,
                overflow: "hidden",
                animation: "scaleIn 0.15s ease-out both",
                transformOrigin: "top center",
                zIndex: 200,
              }}
            >
              {results.length > 0
                ? results.map((coin) => (
                    <SearchResult
                      key={coin.id}
                      coin={coin}
                      onSelect={() => handleSelect(coin.id)}
                    />
                  ))
                : !searching && (
                    <div
                      style={{
                        padding: "14px 16px",
                        color: C.text3,
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      No results for "{query}"
                    </div>
                  )}
            </div>
          )}
        </div>

        {/* Currency switcher */}
        <div ref={currencyRef} style={{ position: "relative", marginLeft: 8 }}>
          <CurrencyButton
            onClick={() => setShowCurrency((v) => !v)}
            label={`${activeCurrency.symbol} ${activeCurrency.label}`}
          />
          {showCurrency && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: C.bgElevated,
                border: `1px solid ${C.borderMd}`,
                borderRadius: 12,
                boxShadow: C.shadowLg,
                minWidth: 130,
                overflow: "hidden",
                animation: "scaleIn 0.15s ease-out both",
                transformOrigin: "top right",
              }}
            >
              {CURRENCIES.map((c) => (
                <CurrencyOption
                  key={c.code}
                  currency={c}
                  isSelected={c.code === currency}
                  onSelect={() => {
                    setCurrency(c.code);
                    setShowCurrency(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );
}

// ── Single search result row ──
function SearchResult({ coin, onSelect }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        background: hovered ? C.bgHover : "transparent",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      <img
        src={coin.thumb}
        alt={coin.name}
        style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text1, fontSize: 13, fontWeight: 600 }}>
          {coin.name}
        </div>
        <div
          style={{
            color: C.text3,
            fontSize: 10,
            fontFamily: "var(--ff-mono)",
            textTransform: "uppercase",
          }}
        >
          {coin.symbol}
        </div>
      </div>
      {coin.market_cap_rank && (
        <span
          style={{
            color: C.text4,
            fontSize: 11,
            fontFamily: "var(--ff-mono)",
          }}
        >
          #{coin.market_cap_rank}
        </span>
      )}
    </div>
  );
}

function CurrencyButton({ onClick, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 8,
        border: `1px solid ${C.borderMd}`,
        background: hovered ? C.bgHover : "transparent",
        color: C.text2,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--ff-mono)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
      <ChevronDown size={12} />
    </button>
  );
}

function CurrencyOption({ currency, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 14px",
        border: "none",
        background: isSelected
          ? "rgba(61,142,248,0.08)"
          : hovered
            ? C.bgHover
            : "transparent",
        color: isSelected ? C.blue : C.text2,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
        fontFamily: "var(--ff-body)",
      }}
    >
      <span style={{ fontFamily: "var(--ff-mono)", minWidth: 16 }}>
        {currency.symbol}
      </span>
      {currency.label}
      {isSelected && (
        <span style={{ marginLeft: "auto", color: C.blue, fontSize: 11 }}>
          ✓
        </span>
      )}
    </button>
  );
}

function NavLink({ to, isActive, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 12px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
        transition: "all 0.15s",
        color: isActive ? C.blue : hovered ? C.text1 : C.text2,
        background: isActive
          ? "rgba(61,142,248,0.10)"
          : hovered
            ? C.bgHover
            : "transparent",
      }}
    >
      {children}
    </Link>
  );
}
function ThemeToggle({ theme, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          32,
        height:         32,
        borderRadius:   8,
        border:         `1px solid ${C.borderMd}`,
        background:     hovered ? C.bgHover : 'transparent',
        color:          C.text2,
        cursor:         'pointer',
        transition:     'all 0.15s',
        flexShrink:     0,
      }}
    >
      {theme === 'dark'
        ? <Sun  size={14} />
        : <Moon size={14} />
      }
    </button>
  )
}