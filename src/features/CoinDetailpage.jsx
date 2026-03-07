import { useState, useEffect }       from 'react'
import { useParams, useNavigate }    from 'react-router-dom'
import { ArrowLeft, ExternalLink, Star } from 'lucide-react'
import { fetchCoinDetail }           from '../utils/marketAPI'
import { useCurrency, CURRENCIES }   from '../context/CurrencyContext'
import { useWatchlist }              from '../store/watchlistStore'
import { usePageTitle }              from '../hooks/usePageTitle'
import CandlestickChart              from '../components/CandlestickChart'

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

function fmtLarge(n, sym = '$') {
  if (!n) return '—'
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `${sym}${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `${sym}${(n / 1e6).toFixed(2)}M`
  return `${sym}${n.toLocaleString()}`
}

function fmtPct(n) {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function CoinDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { currency } = useCurrency()
  const { toggle, has } = useWatchlist()

  const [coin,    setCoin]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  usePageTitle(coin ? `${coin.name} (${coin.symbol?.toUpperCase()})` : null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await fetchCoinDetail(id)
      if (controller.signal.aborted) return
      if (error) setError(error)
      else setCoin(data)
      setLoading(false)
    }

    load()
    return () => controller.abort()
  }, [id])

  if (loading) return <LoadingSkeleton />

  if (error || !coin) return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', gap: 12,
    }}>
      <p style={{ color: 'var(--text1)', fontSize: 16, fontWeight: 600 }}>
        Could not load coin data
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: 'var(--blue)', color: '#fff',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Back to Markets
      </button>
    </div>
  )

  const md        = coin.market_data
  const price     = md?.current_price?.[currency]
  const isWatched = has(coin.id)

  const priceStats = [
    { label: '24h High',  value: fmtPrice(md?.high_24h?.[currency],  currency), color: 'var(--green)' },
    { label: '24h Low',   value: fmtPrice(md?.low_24h?.[currency],   currency), color: 'var(--red)'   },
    { label: 'ATH',       value: fmtPrice(md?.ath?.[currency],       currency), color: 'var(--gold)'  },
    { label: 'ATL',       value: fmtPrice(md?.atl?.[currency],       currency), color: 'var(--text2)' },
  ]

  const marketStats = [
    { label: 'Market Cap',         value: fmtLarge(md?.market_cap?.[currency])     },
    { label: '24h Volume',         value: fmtLarge(md?.total_volume?.[currency])   },
    { label: 'Circulating Supply', value: md?.circulating_supply
        ? `${(md.circulating_supply / 1e6).toFixed(2)}M ${coin.symbol?.toUpperCase()}` : '—' },
    { label: 'Max Supply',         value: md?.max_supply
        ? `${(md.max_supply / 1e6).toFixed(2)}M ${coin.symbol?.toUpperCase()}` : '∞' },
    { label: 'Market Cap Rank',    value: coin.market_cap_rank ? `#${coin.market_cap_rank}` : '—' },
    { label: 'Coingecko Rank',     value: coin.coingecko_rank  ? `#${coin.coingecko_rank}`  : '—' },
  ]

  const changes = [
    { label: '1h',  value: md?.price_change_percentage_1h_in_currency?.[currency]  },
    { label: '24h', value: md?.price_change_percentage_24h_in_currency?.[currency] },
    { label: '7d',  value: md?.price_change_percentage_7d_in_currency?.[currency]  },
    { label: '14d', value: md?.price_change_percentage_14d_in_currency?.[currency] },
    { label: '30d', value: md?.price_change_percentage_30d_in_currency?.[currency] },
    { label: '1y',  value: md?.price_change_percentage_1y_in_currency?.[currency]  },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 20, padding: '6px 12px',
          borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text3)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >
        <ArrowLeft size={14} />
        Back
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
          style={{ width: 56, height: 56, borderRadius: '50%' }}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{
              color: 'var(--text1)', fontSize: 26,
              fontWeight: 800, fontFamily: 'var(--ff-display)',
            }}>
              {coin.name}
            </h1>
            <span style={{
              color: 'var(--text3)', fontSize: 14,
              fontFamily: 'var(--ff-mono)',
              textTransform: 'uppercase',
            }}>
              {coin.symbol}
            </span>
            {coin.market_cap_rank && (
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: 'var(--bg-hover)',
                color: 'var(--text3)', fontSize: 11, fontWeight: 700,
              }}>
                #{coin.market_cap_rank}
              </span>
            )}
          </div>

          {/* Category tags */}
          {coin.categories?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {coin.categories.slice(0, 4).filter(Boolean).map(cat => (
                <span key={cat} style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(61,142,248,0.10)',
                  color: 'var(--blue)', fontSize: 10, fontWeight: 600,
                }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Watch + links */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => toggle(coin.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: `1px solid ${isWatched ? 'var(--gold)' : 'var(--border-md)'}`,
              background: isWatched ? 'rgba(245,158,11,0.10)' : 'transparent',
              color: isWatched ? 'var(--gold)' : 'var(--text3)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Star
              size={14}
              fill={isWatched ? 'var(--gold)' : 'none'}
              color={isWatched ? 'var(--gold)' : 'var(--text3)'}
            />
            {isWatched ? 'Watching' : 'Watch'}
          </button>

          {coin.links?.homepage?.[0] && (
            <a
            
              href={coin.links.homepage[0]}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid var(--border-md)',
                color: 'var(--text3)', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <ExternalLink size={13} />
              Website
            </a>
          )}
        </div>
      </div>

      {/* Price + change */}
      <div style={{
        display:      'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:          16,
        marginBottom: 20,
      }}>
        {/* Current price */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 24px',
        }}>
          <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 8 }}>
            Current Price
          </div>
          <div style={{
            color: 'var(--text1)', fontSize: 36,
            fontWeight: 800, fontFamily: 'var(--ff-mono)',
            letterSpacing: '-0.02em',
          }}>
            {fmtPrice(price, currency)}
          </div>
          <div style={{
            display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap',
          }}>
            {changes.map(({ label, value }) => (
              <div key={label}>
                <div style={{ color: 'var(--text4)', fontSize: 10, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{
                  color: value == null ? 'var(--text3)' : value >= 0 ? 'var(--green)' : 'var(--red)',
                  fontSize: 12, fontWeight: 700, fontFamily: 'var(--ff-mono)',
                }}>
                  {fmtPct(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price stats */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 24px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        }}>
          {priceStats.map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{
                color, fontSize: 15, fontWeight: 700,
                fontFamily: 'var(--ff-mono)',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Candlestick Chart */}
      <div style={{
        background:   'var(--bg-elevated)',
        border:       '1px solid var(--border)',
        borderRadius: 14,
        padding:      '20px',
        marginBottom: 20,
      }}>
        <CandlestickChart
          coinId={coin.id}
          currency={currency}
          height={380}
        />
      </div>

      {/* Market stats */}
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ color: 'var(--text2)', fontSize: 13,
          fontWeight: 700, marginBottom: 16 }}>
          Market Stats
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {marketStats.map(({ label, value }) => (
            <div key={label} style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--bg-base)', border: '1px solid var(--border)',
            }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{
                color: 'var(--text1)', fontSize: 14,
                fontWeight: 700, fontFamily: 'var(--ff-mono)',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {coin.description?.en && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 24px',
        }}>
          <div style={{ color: 'var(--text2)', fontSize: 13,
            fontWeight: 700, marginBottom: 12 }}>
            About {coin.name}
          </div>
          <div
            style={{
              color: 'var(--text2)', fontSize: 13,
              lineHeight: 1.7, maxHeight: 200,
              overflowY: 'auto',
            }}
            dangerouslySetInnerHTML={{
              __html: coin.description.en
                .split('. ').slice(0, 8).join('. ')
                .replace(/<a /g, '<a style="color:var(--blue)" ')
            }}
          />
        </div>
      )}

    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Shimmer width={56} height={56} radius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Shimmer width={200} height={28} />
          <Shimmer width={120} height={16} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Shimmer height={140} />
        <Shimmer height={140} />
      </div>
      <Shimmer height={420} />
      <Shimmer height={200} />
    </div>
  )
}

function Shimmer({ width = '100%', height, radius = 10 }) {
  return (
    <div style={{
      width, height, borderRadius: radius, flexShrink: 0,
      background: 'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}