import { useState, useRef, useEffect } from 'react'
import { Link, useLocation }           from 'react-router-dom'
import { BarChart2, ChevronDown }      from 'lucide-react'
import { C }                           from '../utils/theme'
import { useCurrency, CURRENCIES }     from '../context/CurrencyContext'

const NAV_LINKS = [
  { to: '/',          label: 'Markets'   },
  { to: '/trending',  label: 'Trending'  },
  { to: '/gainers',   label: 'Movers'    },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/portfolio', label: 'Portfolio' },
]

export default function Header() {
  const location                  = useLocation()
  const { currency, setCurrency } = useCurrency()

  // controls whether currency dropdown is open
  const [showCurrency, setShowCurrency] = useState(false)

  // ref to detect clicks outside the dropdown
  // when user clicks anywhere else, close it
  const currencyRef = useRef(null)

  // Close currency dropdown when user clicks outside it
  useEffect(() => {
    const handleClick = (e) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setShowCurrency(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    // cleanup — remove listener when Header unmounts
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Find the active currency object so we can show its symbol
  const activeCurrency = CURRENCIES.find(c => c.code === currency)

  return (
    <header style={{
      position:       'fixed',
      top: 0, left: 0, right: 0,
      height:         52,
      background:     C.bgElevated,
      borderBottom:   `1px solid ${C.borderMd}`,
      zIndex:         100,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth:   1400,
        margin:     '0 auto',
        height:     '100%',
        padding:    '0 20px',
        display:    'flex',
        alignItems: 'center',
        gap:        8,
      }}>

        {/* Logo */}
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', marginRight: 16, flexShrink: 0,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: C.blue, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{
            color: C.text1, fontFamily: 'var(--ff-display)',
            fontWeight: 800, fontSize: 13, letterSpacing: '0.1em',
          }}>
            CRYPTOTRACKER
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} isActive={location.pathname === to}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Push currency to the right */}
        <div style={{ marginLeft: 'auto' }} />

        {/* ── Currency Switcher ── */}
        <div ref={currencyRef} style={{ position: 'relative' }}>

          {/* Button that opens the dropdown */}
          <CurrencyButton
            onClick={() => setShowCurrency(v => !v)}
            label={`${activeCurrency.symbol} ${activeCurrency.label}`}
          />

          {/* Dropdown */}
          {showCurrency && (
            <div style={{
              position:   'absolute',
              top:        'calc(100% + 8px)',
              right:      0,
              background: C.bgElevated,
              border:     `1px solid ${C.borderMd}`,
              borderRadius: 12,
              boxShadow:  C.shadowLg,
              minWidth:   130,
              overflow:   'hidden',
              animation:  'scaleIn 0.15s ease-out both',
              transformOrigin: 'top right',
            }}>
              {CURRENCIES.map((c) => (
                <CurrencyOption
                  key={c.code}
                  currency={c}
                  isSelected={c.code === currency}
                  onSelect={() => {
                    setCurrency(c.code)
                    setShowCurrency(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

// ── Currency dropdown trigger button ──
function CurrencyButton({ onClick, label }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          6,
        padding:      '5px 10px',
        borderRadius: 8,
        border:       `1px solid ${C.borderMd}`,
        background:   hovered ? C.bgHover : 'transparent',
        color:        C.text2,
        fontSize:     12,
        fontWeight:   600,
        fontFamily:   'var(--ff-mono)',
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {label}
      <ChevronDown size={12} />
    </button>
  )
}

// ── Single option inside the dropdown ──
function CurrencyOption({ currency, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        width:       '100%',
        padding:     '9px 14px',
        border:      'none',
        background:  isSelected ? 'rgba(61,142,248,0.08)' : hovered ? C.bgHover : 'transparent',
        color:       isSelected ? C.blue : C.text2,
        fontSize:    13,
        fontWeight:  600,
        cursor:      'pointer',
        transition:  'all 0.15s',
        textAlign:   'left',
        fontFamily:  'var(--ff-body)',
      }}
    >
      <span style={{ fontFamily: 'var(--ff-mono)', minWidth: 16 }}>
        {currency.symbol}
      </span>
      {currency.label}
      {isSelected && (
        <span style={{ marginLeft: 'auto', color: C.blue, fontSize: 11 }}>✓</span>
      )}
    </button>
  )
}

// ── Nav link with hover ──
function NavLink({ to, isActive, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        padding:        '5px 12px',
        borderRadius:   8,
        fontSize:       13,
        fontWeight:     600,
        textDecoration: 'none',
        transition:     'all 0.15s',
        color:      isActive ? C.blue    : hovered ? C.text1   : C.text2,
        background: isActive ? 'rgba(61,142,248,0.10)' : hovered ? C.bgHover : 'transparent',
      }}
    >
      {children}
    </Link>
  )
}