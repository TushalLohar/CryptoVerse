import { Outlet, Link, useLocation } from 'react-router-dom'
import Header from './Header'
import {
  TrendingUp, Flame, ArrowUpDown, Star, Wallet
} from 'lucide-react'


// Only 5 most important pages — mobile screen can't fit more
const BOTTOM_NAV = [
  { to: '/',          icon: TrendingUp,  label: 'Markets'  },
  { to: '/trending',  icon: Flame,       label: 'Trending' },
  { to: '/gainers',   icon: ArrowUpDown, label: 'Movers'   },
  { to: '/watchlist', icon: Star,        label: 'Watch'    },
  { to: '/portfolio', icon: Wallet,      label: 'Portfolio'},
]

export default function AppLayout() {
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      <Header />

      <main style={{
        maxWidth: 1400,
        margin:   '0 auto',
        padding:  '72px 20px 80px', // 80px bottom = clears the bottom nav
      }}>
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ── */}
      {/* Hidden on desktop via @media in a style tag */}
      <BottomNav location={location} />

    </div>
  )
}

function BottomNav({ location }) {
  return (
    <>
      {/* Inline media query — only way to do responsive without Tailwind */}
      <style>{`
        .bottom-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .bottom-nav {
            display: flex;
          }
          /* Hide desktop nav links on mobile */
          .desktop-nav {
            display: none !important;
          }
        }
      `}</style>

      <nav
        className="bottom-nav"
        style={{
          position:       'fixed',
          bottom:         0,
          left:           0,
          right:          0,
          height:         58,
          background:     'var(--bg-elevated)',
          borderTop:      '1px solid var(--border)',
          zIndex:         100,
          alignItems:     'center',
          justifyContent: 'space-around',
          backdropFilter: 'blur(12px)',
        }}
      >
        {BOTTOM_NAV.map(({ to, icon:Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            3,
                padding:        '4px 16px',
                textDecoration: 'none',
                color:          isActive ? 'var(--blue)' : 'var(--text3)',
                fontSize:       9,
                fontWeight:     600,
                letterSpacing:  '0.04em',
                textTransform:  'uppercase',
                transition:     'color 0.15s',
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}