import { useState }                    from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { ArrowLeft, ExternalLink }     from 'lucide-react'
import { useCoinDetail }               from '../hooks/useCoinDetail'
import { useCurrency, CURRENCIES }     from '../context/CurrencyContext'
import CoinChart                       from './components/CoinChart'

function fmtPrice(price, currency) {
  if (price == null) return '—'
  if (currency === 'btc') return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${price.toFixed(price < 0.01  ? 6 : 4)}`
  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'
  return `${sym}${price.toLocaleString(undefined, {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

function fmtLarge(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function CoinDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { currency } = useCurrency()

  const { coin, loading, error } = useCoinDetail(id)

  if (loading) return <LoadingSkeleton />

  if (error) return (
    <div style={{ color: 'var(--red)', padding: '2rem' }}>Error: {error}</div>
  )

  if (!coin) return null

  const md        = coin.market_data
  const price     = md?.current_price?.[currency]
  const change24h = md?.price_change_percentage_24h
  const change7d  = md?.price_change_percentage_7d
  const high24h   = md?.high_24h?.[currency]
  const low24h    = md?.low_24h?.[currency]
  const marketCap = md?.market_cap?.[currency]
  const volume    = md?.total_volume?.[currency]
  const supply    = md?.circulating_supply
  const ath       = md?.ath?.[currency]
  const athChange = md?.ath_change_percentage?.[currency]
  const isUp      = change24h >= 0

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          background:   'none',
          border:       'none',
          color:        'var(--text2)',
          fontSize:     13,
          fontWeight:   600,
          cursor:       'pointer',
          marginBottom: 20,
          padding:      0,
          transition:   'color 0.15s',
        }}
      >
        <ArrowLeft size={15} />
        Back to Markets
      </button>

      {/* Coin header */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        marginBottom: 24,
        flexWrap:     'wrap',
      }}>
        <img
          src={coin.image?.large}
          alt={coin.name}
          style={{ width: 52, height: 52, borderRadius: '50%' }}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{
              color:      'var(--text1)',
              fontSize:   26,
              fontWeight: 800,
              fontFamily: 'var(--ff-display)',
            }}>
              {coin.name}
            </h1>
            <span style={{
              color:         'var(--text3)',
              fontSize:      13,
              fontFamily:    'var(--ff-mono)',
              textTransform: 'uppercase',
            }}>
              {coin.symbol}
            </span>
            {coin.market_cap_rank && (
              <span style={{
                background:   'var(--bg-hover)',
                border:       `1px solid var(--border-md)`,
                borderRadius: 6,
                padding:      '2px 8px',
                fontSize:     11,
                color:        'var(--text3)',
                fontFamily:   'var(--ff-mono)',
              }}>
                #{coin.market_cap_rank}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{
              color:      'var(--text1)',
              fontSize:   30,
              fontWeight: 700,
              fontFamily: 'var(--ff-mono)',
            }}>
              {fmtPrice(price, currency)}
            </span>
            <span style={{
              color:        isUp ? 'var(--green)' : 'var(--red)',
              fontSize:     15,
              fontWeight:   700,
              fontFamily:   'var(--ff-mono)',
              background:   isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
              padding:      '3px 10px',
              borderRadius: 8,
            }}>
              {isUp ? '+' : ''}{change24h?.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap:                 16,
        alignItems:          'start',
      }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Price stats */}
          <div style={{
            background:   'var(--bg-elevated)',
            border:       `1px solid var(--border)`,
            borderRadius: 14,
            padding:      20,
          }}>
            <SectionTitle>Price Statistics</SectionTitle>
            <StatRow label="Current Price" value={fmtPrice(price, currency)} />
            <StatRow label="24h High"      value={fmtPrice(high24h, currency)} valueColor="var(--green)" />
            <StatRow label="24h Low"       value={fmtPrice(low24h, currency)}  valueColor="var(--red)" />
            <StatRow label="7d Change"     value={`${change7d?.toFixed(2)}%`}  valueColor={change7d >= 0 ? 'var(--green)' : 'var(--red)'} />
            <StatRow label="All Time High" value={fmtPrice(ath, currency)} />
            <StatRow label="ATH Change"    value={`${athChange?.toFixed(2)}%`} valueColor={athChange >= 0 ? 'var(--green)' : 'var(--red)'} />
          </div>

          {/* Market stats */}
          <div style={{
            background:   'var(--bg-elevated)',
            border:       `1px solid var(--border)`,
            borderRadius: 14,
            padding:      20,
          }}>
            <SectionTitle>Market Stats</SectionTitle>
            <StatRow label="Market Cap"         value={fmtLarge(marketCap)} />
            <StatRow label="24h Volume"         value={fmtLarge(volume)} />
            <StatRow label="Circulating Supply" value={supply ? `${supply.toLocaleString()} ${coin.symbol?.toUpperCase()}` : '—'} />
          </div>

          {/* Links */}
          {coin.links?.homepage?.[0] && (
            <div style={{
              background:   'var(--bg-elevated)',
              border:       `1px solid var(--border)`,
              borderRadius: 14,
              padding:      20,
            }}>
              <SectionTitle>Links</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <LinkPill href={coin.links.homepage[0]} label="Website" />
                {coin.links?.blockchain_site?.[0] && (
                  <LinkPill href={coin.links.blockchain_site[0]} label="Explorer" />
                )}
                {coin.links?.subreddit_url && (
                  <LinkPill href={coin.links.subreddit_url} label="Reddit" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Chart */}
          <CoinChart coinId={id} />

          {/* Description */}
          <div style={{
            background:   'var(--bg-elevated)',
            border:       `1px solid var(--border)`,
            borderRadius: 14,
            padding:      20,
          }}>
            <SectionTitle>About {coin.name}</SectionTitle>
            <p style={{
              color:      'var(--text2)',
              fontSize:   13,
              lineHeight: 1.7,
              marginTop:  12,
            }}>
              {coin.description?.en
                ? coin.description.en.replace(/<[^>]+>/g, '').slice(0, 800) + '...'
                : 'No description available.'
              }
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──

function SectionTitle({ children }) {
  return (
    <div style={{
      color:         'var(--text1)',
      fontSize:      13,
      fontWeight:    700,
      paddingBottom: 10,
      marginBottom:  4,
      borderBottom:  `1px solid var(--border)`,
    }}>
      {children}
    </div>
  )
}

function StatRow({ label, value, valueColor }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '9px 0',
      borderBottom:   `1px solid var(--border)`,
    }}>
      <span style={{ color: 'var(--text3)', fontSize: 13 }}>{label}</span>
      <span style={{
        color:      valueColor || 'var(--text1)',
        fontSize:   13,
        fontWeight: 600,
        fontFamily: 'var(--ff-mono)',
      }}>
        {value}
      </span>
    </div>
  )
}

function LinkPill({ href, label }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
    
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            5,
        padding:        '5px 12px',
        borderRadius:   999,
        border:         `1px solid ${hovered ? 'var(--blue)' : 'var(--border-md)'}`,
        color:          hovered ? 'var(--blue)' : 'var(--text2)',
        fontSize:       12,
        fontWeight:     600,
        textDecoration: 'none',
        transition:     'all 0.15s',
        background:     hovered ? 'rgba(61,142,248,0.08)' : 'transparent',
      }}
    >
      {label}
      <ExternalLink size={11} />
    </a>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <Shimmer width={120} height={13} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Shimmer width={52} height={52} radius="50%" />
        <div>
          <Shimmer width={200} height={28} style={{ marginBottom: 8 }} />
          <Shimmer width={150} height={36} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
        <Shimmer width="100%" height={380} radius={14} />
        <Shimmer width="100%" height={380} radius={14} />
      </div>
    </div>
  )
}

function Shimmer({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width,
      height,
      borderRadius:   radius,
      flexShrink:     0,
      background:     'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}