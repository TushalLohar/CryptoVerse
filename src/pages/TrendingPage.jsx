import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { TrendingUp, Flame, Star } from 'lucide-react'
import { fetchTrending }       from '../utils/marketAPI'
import { useWatchlist }        from '../store/watchlistStore'

export default function TrendingPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: d, error: err } = await fetchTrending()
        if (err) throw new Error(err)
        setData(d)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <TrendingSkeleton />
  
  if (error) return (
    <div className="p-8 text-[var(--red)] bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)]">
      <p className="font-bold">Error loading trending data:</p>
      <p className="text-sm opacity-80">{error}</p>
    </div>
  )

  const trendingCoins = data?.coins || []
  const trendingNfts  = data?.nfts  || []

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both] pb-10">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Flame size={20} />
        </div>
        <div>
          <h1 className="text-[var(--text1)] text-2xl font-bold font-[var(--ff-display)] tracking-tight">
            Trending
          </h1>
          <p className="text-[var(--text3)] text-sm">
            Most searched assets in the last 24h
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Trending Coins */}
        <div className="flex flex-col gap-4">
          <SectionHeader icon={<TrendingUp size={14} />} title="Trending Coins" count={trendingCoins.length} />
          <div className="flex flex-col gap-2">
            {trendingCoins.map((item, index) => (
              <TrendingCoinRow key={item.item.id} coin={item.item} rank={index + 1} />
            ))}
          </div>
        </div>

        {/* Trending NFTs */}
        <div className="flex flex-col gap-4">
          <SectionHeader icon={<Flame size={14} />} title="Trending NFTs" count={trendingNfts.length} />
          <div className="flex flex-col gap-2">
            {trendingNfts.map((nft, index) => (
              <TrendingNftRow key={nft.id} nft={nft} rank={index + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Internal Components ---

function SectionHeader({ icon, title, count }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
      <span className="text-[var(--text3)]">{icon}</span>
      <h2 className="text-[var(--text1)] text-sm font-bold uppercase tracking-wider">{title}</h2>
      <span className="ml-auto text-[10px] font-mono font-bold bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-2 py-0.5 text-[var(--text3)]">
        {count}
      </span>
    </div>
  )
}

function TrendingCoinRow({ coin, rank }) {
  const navigate = useNavigate()
  const { toggle, has } = useWatchlist()
  const isWatched = has(coin.id)

  const change = coin.data?.price_change_percentage_24h?.usd
  const isUp = change >= 0

  return (
    <div
      onClick={() => navigate(`/coin/${coin.id}`)}
      className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:bg-[var(--bg-hover)] hover:border-[var(--border-md)] transition-all cursor-pointer group"
    >
      <span className="w-5 text-center font-mono text-[11px] text-[var(--text4)] font-bold">{rank}</span>
      <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full shadow-sm" />
      
      <div className="flex-1 min-w-0">
        <div className="text-[var(--text1)] font-bold text-sm truncate">{coin.name}</div>
        <div className="text-[var(--text3)] text-[10px] font-mono font-bold uppercase">{coin.symbol}</div>
      </div>

      <div className="text-right flex flex-col items-end">
        <span className="text-[var(--text2)] font-mono text-xs font-bold">
          {coin.data?.price_btc ? `₿${parseFloat(coin.data.price_btc).toFixed(8)}` : '—'}
        </span>
        {change != null && (
          <span className={`text-[10px] font-bold ${isUp ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); toggle(coin.id) }}
        className="p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors ml-1"
      >
        <Star 
          size={14} 
          fill={isWatched ? 'var(--gold)' : 'none'} 
          className={isWatched ? 'text-[var(--gold)]' : 'text-[var(--text4)]'} 
        />
      </button>
    </div>
  )
}

function TrendingNftRow({ nft, rank }) {
  const change = nft.data?.floor_price_24h_percentage_change
  const isUp = change >= 0

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:border-[var(--border-md)] transition-all">
      <span className="w-5 text-center font-mono text-[11px] text-[var(--text4)] font-bold">{rank}</span>
      <img src={nft.thumb} alt={nft.name} className="w-8 h-8 rounded-lg shadow-sm" />
      
      <div className="flex-1 min-w-0">
        <div className="text-[var(--text1)] font-bold text-sm truncate">{nft.name}</div>
        <div className="text-[var(--text3)] text-[10px] font-mono font-bold truncate">Floor: {nft.data?.floor_price || '—'}</div>
      </div>

      {change != null && (
        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono ${isUp ? 'bg-green-500/10 text-[var(--green)]' : 'bg-red-500/10 text-[var(--red)]'}`}>
          {isUp ? '+' : ''}{parseFloat(change).toFixed(2)}%
        </div>
      )}
    </div>
  )
}

function TrendingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-hover)]" />
        <div className="space-y-2">
          <div className="w-32 h-6 bg-[var(--bg-hover)] rounded" />
          <div className="w-48 h-3 bg-[var(--bg-hover)] rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map(col => (
          <div key={col} className="space-y-4">
            <div className="w-full h-4 bg-[var(--bg-hover)] rounded" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-full h-14 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}