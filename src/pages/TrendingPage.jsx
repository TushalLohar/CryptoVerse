import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { TrendingUp, Flame }   from 'lucide-react'
import { fetchTrending }       from '../utils/marketAPI'
import { useWatchlist }        from '../store/watchlistStore'
import { Star }                from 'lucide-react'

export default function TrendingPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: d, error: err } = await fetchTrending()
      if (err) setError(err)
      else     setData(d)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <TrendingSkeleton />
  if (error)   return (
    <div style={{ color: 'var(--red)', padding: '2rem' }}>Error: {error}</div>
  )

  const trendingCoins = data?.coins || []
  const trendingNfts  = data?.nfts  || []

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   10,
          background:     'rgba(245,158,11,0.15)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Flame size={18} color="var(--gold)" />
        </div>
        <div>
          <h1 style={{
            color:      'var(--text1)',
            fontSize:   22,
            fontWeight: 700,
            fontFamily: 'var(--ff-display)',
          }}>
            Trending
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Most searched coins on CoinGecko in the last 24h
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                 16,
        alignItems:          'start',
      }}>

        {/* ── Trending Coins ── */}
        <div>
          <SectionHeader icon={<TrendingUp size={14} />} title="Trending Coins" count={trendingCoins.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {trendingCoins.map((item, index) => (
              <TrendingCoinRow key={item.item.id} coin={item.item} rank={index + 1} />
            ))}
          </div>
        </div>

        {/* ── Trending NFTs ── */}
        <div>
          <SectionHeader icon={<Flame size={14} />} title="Trending NFTs" count={trendingNfts.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {trendingNfts.map((nft, index) => (
              <TrendingNftRow key={nft.id} nft={nft} rank={index + 1} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Section header ──
function SectionHeader({ icon, title, count }) {
  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         8,
      paddingBottom: 10,
      borderBottom:  '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text3)' }}>{icon}</span>
      <span style={{
        color:      'var(--text1)',
        fontSize:   14,
        fontWeight: 700,
      }}>
        {title}
      </span>
      <span style={{
        color:        'var(--text3)',
        fontSize:     11,
        fontFamily:   'var(--ff-mono)',
        background:   'var(--bg-hover)',
        border:       '1px solid var(--border)',
        borderRadius: 999,
        padding:      '1px 7px',
        marginLeft:   2,
      }}>
        {count}
      </span>
    </div>
  )
}

// ── Trending coin row ──
function TrendingCoinRow({ coin, rank }) {
  const [hovered, setHovered] = useState(false)
  const navigate              = useNavigate()
  const { toggle, has }       = useWatchlist()
  const isWatched             = has(coin.id)

  const change = coin.data?.price_change_percentage_24h?.usd
  const isUp   = change >= 0

  return (
    <div
      onClick={() => navigate(`/coin/${coin.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '11px 14px',
        background:   hovered ? 'var(--bg-hover)'  : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {/* Rank */}
      <span style={{
        color:      'var(--text4)',
        fontSize:   11,
        fontFamily: 'var(--ff-mono)',
        minWidth:   16,
        textAlign:  'center',
      }}>
        {rank}
      </span>

      {/* Logo */}
      <img
        src={coin.thumb}
        alt={coin.name}
        style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
      />

      {/* Name + symbol */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color:        'var(--text1)',
          fontWeight:   600,
          fontSize:     13,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {coin.name}
        </div>
        <div style={{
          color:         'var(--text3)',
          fontSize:      10,
          fontFamily:    'var(--ff-mono)',
          textTransform: 'uppercase',
          marginTop:     1,
        }}>
          {coin.symbol}
        </div>
      </div>

      {/* Price in BTC */}
      <div style={{
        color:      'var(--text2)',
        fontSize:   12,
        fontFamily: 'var(--ff-mono)',
        flexShrink: 0,
      }}>
        {coin.data?.price_btc
          ? `₿${parseFloat(coin.data.price_btc).toFixed(8)}`
          : '—'
        }
      </div>

      {/* 24h change */}
      {change != null && (
        <div style={{
          color:        isUp ? 'var(--green)' : 'var(--red)',
          fontSize:     11,
          fontWeight:   600,
          fontFamily:   'var(--ff-mono)',
          background:   isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
          padding:      '2px 7px',
          borderRadius: 6,
          flexShrink:   0,
        }}>
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </div>
      )}

      {/* Star */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(coin.id) }}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          26,
          height:         26,
          borderRadius:   6,
          border:         'none',
          background:     'transparent',
          cursor:         'pointer',
          flexShrink:     0,
        }}
      >
        <Star
          size={13}
          fill={isWatched ? 'var(--gold)' : 'none'}
          color={isWatched ? 'var(--gold)' : 'var(--text4)'}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

// ── Trending NFT row ──
function TrendingNftRow({ nft, rank }) {
  const [hovered, setHovered] = useState(false)

  const change = nft.data?.floor_price_24h_percentage_change
  const isUp   = change >= 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '11px 14px',
        background:   hovered ? 'var(--bg-hover)'  : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'default',
        transition:   'all 0.15s',
      }}
    >
      {/* Rank */}
      <span style={{
        color:      'var(--text4)',
        fontSize:   11,
        fontFamily: 'var(--ff-mono)',
        minWidth:   16,
        textAlign:  'center',
      }}>
        {rank}
      </span>

      {/* Thumb */}
      <img
        src={nft.thumb}
        alt={nft.name}
        style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}
      />

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color:        'var(--text1)',
          fontWeight:   600,
          fontSize:     13,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {nft.name}
        </div>
        <div style={{
          color:      'var(--text3)',
          fontSize:   10,
          fontFamily: 'var(--ff-mono)',
          marginTop:  1,
        }}>
          Floor: {nft.data?.floor_price || '—'}
        </div>
      </div>

      {/* 24h change */}
      {change != null && (
        <div style={{
          color:        isUp ? 'var(--green)' : 'var(--red)',
          fontSize:     11,
          fontWeight:   600,
          fontFamily:   'var(--ff-mono)',
          background:   isUp ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
          padding:      '2px 7px',
          borderRadius: 6,
          flexShrink:   0,
        }}>
          {isUp ? '+' : ''}{parseFloat(change).toFixed(2)}%
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ──
function TrendingSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Shimmer width={36} height={36} radius={10} />
        <div>
          <Shimmer width={140} height={22} style={{ marginBottom: 6 }} />
          <Shimmer width={200} height={13} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Shimmer width="100%" height={18} style={{ marginBottom: 8 }} />
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} width="100%" height={54} radius={12} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Shimmer width="100%" height={18} style={{ marginBottom: 8 }} />
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} width="100%" height={54} radius={12} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Shimmer({ width, height, radius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius, flexShrink: 0,
      background:     'linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}