import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useWatchlist } from '../store/watchlistStore'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { fetchPortfolioCoins } from '../utils/marketAPI'

function fmtPrice(price, currency) {
  if (price == null) return '—'

  if (currency === 'btc') return `₿${price.toFixed(price < 0.001 ? 8 : 4)}`
  if (currency === 'eth') return `Ξ${price.toFixed(price < 0.01 ? 6 : 4)}`

  const sym = CURRENCIES.find(c => c.code === currency)?.symbol || '$'

  return `${sym}${price.toLocaleString(undefined,{
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  })}`
}

export default function WatchlistPage() {

  const { ids, toggle } = useWatchlist()
  const { currency } = useCurrency()
  const navigate = useNavigate()

  const [coins,setCoins] = useState([])
  const [loading,setLoading] = useState(false)

  useEffect(()=>{

    if(!ids.length) return

    const load = async () => {

      setLoading(true)

      const { data } = await fetchPortfolioCoins(ids,currency)

      setCoins(data || [])

      setLoading(false)

    }

    load()

  },[ids,currency])



  if(!ids.length) return (

    <div className="animate-[fadeUp_0.25s_ease-out_both]">

      <h1 className="text-[22px] font-bold text-[var(--text1)] font-[var(--ff-display)] mb-2">
        Watchlist
      </h1>

      <p className="text-[14px] text-[var(--text3)] mb-8">
        Your saved coins will appear here.
      </p>


      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[16px] p-12 text-center flex flex-col items-center gap-3">

        <div className="w-[52px] h-[52px] rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
          <Star size={22} className="text-[var(--text4)]"/>
        </div>

        <p className="text-[15px] font-semibold text-[var(--text2)]">
          No coins yet
        </p>

        <p className="text-[13px] text-[var(--text3)]">
          Click the ★ on any coin in Markets to add it here
        </p>

        <button
        onClick={()=>navigate('/')}
        className="mt-2 px-5 py-2 rounded-[8px] bg-[var(--blue)] text-white text-[13px] font-semibold"
        >
          Browse Markets
        </button>

      </div>

    </div>

  )



  return (

    <div className="animate-[fadeUp_0.25s_ease-out_both]">


      <div className="flex items-center justify-between mb-5">

        <div>

          <h1 className="text-[22px] font-bold text-[var(--text1)] font-[var(--ff-display)]">
            Watchlist
          </h1>

          <p className="text-[13px] text-[var(--text3)] mt-1">
            {ids.length} coin{ids.length !== 1 ? 's' : ''} tracked
          </p>

        </div>

      </div>



      <div className="grid grid-cols-[32px_1fr_120px_90px_32px] gap-[14px] px-[18px] pb-[8px] items-center">

        <span/>

        <span className="text-[11px] font-semibold text-[var(--text3)]">
          Name
        </span>

        <span className="text-[11px] font-semibold text-[var(--text3)] text-right">
          Price
        </span>

        <span className="text-[11px] font-semibold text-[var(--text3)] text-right">
          24h %
        </span>

        <span/>

      </div>



      <div className="flex flex-col gap-1">

        {loading
          ? Array.from({ length: ids.length }).map((_,i)=>(
              <WatchSkeletonRow key={i}/>
            ))

          : coins.map(coin=>(
              <WatchCoinRow
                key={coin.id}
                coin={coin}
                currency={currency}
                onRemove={()=>toggle(coin.id)}
                onClick={()=>navigate(`/coin/${coin.id}`)}
              />
            ))
        }

      </div>

    </div>

  )

}

function WatchCoinRow({ coin,currency,onRemove,onClick }) {

  const change = coin.price_change_percentage_24h
  const isUp = change >= 0

  return (

    <div
    onClick={onClick}
    className="grid grid-cols-[32px_1fr_120px_90px_32px] gap-[14px] px-[18px] py-[12px] items-center rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
    >

      <img
      src={coin.image}
      alt={coin.name}
      className="w-[32px] h-[32px] rounded-full"
      />

      <div>

        <div className="text-[14px] font-semibold text-[var(--text1)]">
          {coin.name}
        </div>

        <div className="text-[11px] text-[var(--text3)] font-[var(--ff-mono)] uppercase mt-[2px]">
          {coin.symbol}
        </div>

      </div>


      <div className="text-[14px] font-semibold text-[var(--text1)] text-right font-[var(--ff-mono)]">
        {fmtPrice(coin.current_price,currency)}
      </div>


      <div
      className="text-[13px] font-semibold text-right font-[var(--ff-mono)] px-[8px] py-[3px] rounded-[6px]"
      style={{
        color: isUp ? 'var(--green)' : 'var(--red)',
        background: isUp
          ? 'rgba(34,197,94,0.10)'
          : 'rgba(244,63,94,0.10)'
      }}
      >
        {isUp ? '+' : ''}{change?.toFixed(2)}%
      </div>


      <button
      onClick={(e)=>{e.stopPropagation(); onRemove()}}
      className="flex items-center justify-center w-[28px] h-[28px]"
      >
        <Star size={14} fill="var(--gold)" strokeWidth={2} className="text-[var(--gold)]"/>
      </button>

    </div>

  )

}



function WatchSkeletonRow(){

  return(

    <div className="grid grid-cols-[32px_1fr_120px_90px_32px] gap-[14px] px-[18px] py-[12px] items-center rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)]">

      <Shimmer width={32} height={32} radius="50%"/>

      <div>

        <Shimmer width={120} height={13}/>
        <Shimmer width={50} height={10} style={{marginTop:5}}/>

      </div>

      <Shimmer width={80} height={13} style={{marginLeft:'auto'}}/>

      <Shimmer width={55} height={24} style={{marginLeft:'auto',borderRadius:6}}/>

      <Shimmer width={28} height={28} radius={6}/>

    </div>

  )

}

function Shimmer({ width,height,radius=4,style={} }){

  return(

    <div
    style={{
      width,
      height,
      borderRadius:radius,
      background:'linear-gradient(90deg,var(--bg-hover)25%,var(--bg-elevated)50%,var(--bg-hover)75%)',
      backgroundSize:'200% 100%',
      animation:'shimmer 1.4s infinite',
      ...style
    }}
    />

  )

}