import { useState, useEffect }     from 'react'
import { useNavigate }             from 'react-router-dom'
import { Wallet, Plus, Trash2, X } from 'lucide-react'
import { usePortfolio }            from '../store/portfolioStore'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { fetchPortfolioCoins, fetchSearch } from '../utils/marketAPI'

// --- Formatting Helpers ---
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
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PortfolioPage() {
  const { holdings, removeHolding } = usePortfolio()
  const { currency }                = useCurrency()
  const navigate                    = useNavigate()

  const [prices, setPrices]             = useState({}) 
  const [loading, setLoading]           = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!holdings.length) return
    const uniqueIds = [...new Set(holdings.map(h => h.coinId))]
    const load = async () => {
      setLoading(true)
      const { data } = await fetchPortfolioCoins(uniqueIds, currency)
      const map = {}
      ;(data || []).forEach(coin => { map[coin.id] = coin.current_price })
      setPrices(map)
      setLoading(false)
    }
    load()
  }, [holdings, currency])

  const totals = holdings.reduce((acc, h) => {
    const currentPrice = prices[h.coinId]
    if (currentPrice == null) return acc
    const currentValue = h.quantity * currentPrice
    const costBasis    = h.quantity * h.buyPrice
    acc.totalValue    += currentValue
    acc.totalCost     += costBasis
    acc.totalPnl      += (currentValue - costBasis)
    return acc
  }, { totalValue: 0, totalCost: 0, totalPnl: 0 })

  const totalPnlPct = totals.totalCost > 0 ? ((totals.totalPnl / totals.totalCost) * 100) : 0
  const isPnlUp = totals.totalPnl >= 0

  if (!holdings.length) return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      <PageHeader onAdd={() => setShowAddModal(true)} />
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-12 text-center flex flex-col items-center gap-3 mt-5">
        <div className="w-[52px] h-[52px] rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text4)]">
          <Wallet size={22} />
        </div>
        <p className="text-[var(--text2)] text-[15px] font-semibold">No holdings yet</p>
        <p className="text-[var(--text3)] text-[13px]">Add your first coin to start tracking your portfolio</p>
        <button onClick={() => setShowAddModal(true)} className="mt-2 px-5 py-2 rounded-lg bg-[var(--blue)] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90">
          <Plus size={14} /> Add Coin
        </button>
      </div>
      {showAddModal && <AddHoldingModal onClose={() => setShowAddModal(false)} />}
    </div>
  )

  return (
    <div className="animate-[fadeUp_0.25s_ease-out_both]">
      <PageHeader onAdd={() => setShowAddModal(true)} />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6 mt-5">
        <SummaryCard label="Total Value" value={loading ? '...' : fmtLarge(totals.totalValue)} valueColor="text-[var(--text1)]" />
        <SummaryCard label="Total Cost" value={loading ? '...' : fmtLarge(totals.totalCost)} valueColor="text-[var(--text2)]" />
        <SummaryCard 
          label="Total P&L" 
          value={loading ? '...' : `${isPnlUp ? '+' : ''}${fmtLarge(totals.totalPnl)} (${isPnlUp ? '+' : ''}${totalPnlPct.toFixed(2)}%)`} 
          valueColor={isPnlUp ? 'text-[var(--green)]' : 'text-[var(--red)]'} 
          highlight 
        />
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-[32px_1fr_100px_100px_120px_100px_32px] gap-3.5 px-[18px] pb-2 items-center text-[11px] font-bold text-[var(--text3)] uppercase">
        <span />
        <span>Coin</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Buy Price</span>
        <span className="text-right">Current Value</span>
        <span className="text-right">P&L</span>
        <span />
      </div>

      {/* Holdings List */}
      <div className="flex flex-col gap-1">
        {holdings.map((holding) => {
          const currentPrice = prices[holding.coinId]
          const currentValue = currentPrice != null ? holding.quantity * currentPrice : null
          const costBasis    = holding.quantity * holding.buyPrice
          const pnl          = currentValue != null ? currentValue - costBasis : null
          const pnlPct       = pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null

          return (
            <HoldingRow
              key={holding.id}
              holding={holding}
              currentPrice={currentPrice}
              currentValue={currentValue}
              pnl={pnl}
              pnlPct={pnlPct}
              currency={currency}
              loading={loading}
              onRemove={() => removeHolding(holding.id)}
              onClick={() => navigate(`/coin/${holding.coinId}`)}
            />
          )
        })}
      </div>

      {showAddModal && <AddHoldingModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}

function PageHeader({ onAdd }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-[10px] bg-[rgba(168,85,247,0.12)] flex items-center justify-center text-[var(--purple)]">
          <Wallet size={18} />
        </div>
        <div>
          <h1 className="text-[var(--text1)] text-[22px] font-bold font-[var(--ff-display)]">Portfolio</h1>
          <p className="text-[var(--text3)] text-[13px] mt-0.5">Track your crypto holdings and P&L</p>
        </div>
      </div>
      <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--blue)] text-white text-[13px] font-semibold transition-colors hover:bg-[#2d7ef0]">
        <Plus size={14} /> Add Holding
      </button>
    </div>
  )
}

function SummaryCard({ label, value, valueColor, highlight }) {
  return (
    <div className={`bg-[var(--bg-elevated)] border rounded-xl p-[16px_20px] ${highlight ? 'border-[var(--border-md)]' : 'border-[var(--border)]'}`}>
      <div className="text-[var(--text3)] text-xs mb-1.5 font-medium uppercase tracking-wide">{label}</div>
      <div className={`${valueColor} text-xl font-bold font-[var(--ff-mono)]`}>{value}</div>
    </div>
  )
}

function HoldingRow({ holding, currentValue, pnl, pnlPct, currency, loading, onRemove, onClick }) {
  const isUp = (pnl ?? 0) >= 0

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[32px_1fr_100px_100px_120px_100px_32px] gap-3.5 px-[18px] py-3 items-center bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl cursor-pointer transition-all duration-150 hover:bg-[var(--bg-hover)] hover:border-[var(--border-md)] group"
    >
      <img src={holding.coinImage} alt={holding.coinName} className="w-8 h-8 rounded-full" />
      <div>
        <div className="text-[var(--text1)] font-semibold text-sm">{holding.coinName}</div>
        <div className="text-[var(--text3)] text-[11px] mt-0.5 font-[var(--ff-mono)] uppercase">{holding.coinSymbol}</div>
      </div>
      <div className="text-[var(--text2)] font-[var(--ff-mono)] text-[13px] text-right">
        {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
      </div>
      <div className="text-[var(--text2)] font-[var(--ff-mono)] text-[13px] text-right">
        {fmtPrice(holding.buyPrice, currency)}
      </div>
      <div className="text-[var(--text1)] font-[var(--ff-mono)] font-semibold text-sm text-right">
        {loading || currentValue == null ? '...' : fmtLarge(currentValue)}
      </div>
      <div className={`font-[var(--ff-mono)] font-semibold text-[13px] text-right ${loading || pnl == null ? 'text-[var(--text3)]' : isUp ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {loading || pnl == null ? '...' : `${isUp ? '+' : ''}${pnlPct?.toFixed(2)}%`}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text4)] hover:text-[var(--red)] transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function AddHoldingModal({ onClose }) {
  const { addHolding } = usePortfolio()
  const [query, setQuery] = useState('')
  const [searchResults, setResults] = useState([])
  const [selectedCoin, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [searching, setSearching] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (query.length < 2) {
      queueMicrotask(() => setResults([]))
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await fetchSearch(query)
      setResults((data?.coins || []).slice(0, 6))
      setSearching(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const handleAdd = () => {
    if (!selectedCoin || !quantity || !buyPrice) return
    addHolding({
      coinId: selectedCoin.id,
      coinName: selectedCoin.name,
      coinSymbol: selectedCoin.symbol,
      coinImage: selectedCoin.thumb,
      quantity: parseFloat(quantity),
      buyPrice: parseFloat(buyPrice),
    })
    onClose()
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center backdrop-blur-sm px-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-[var(--bg-elevated)] border border-[var(--border-md)] rounded-2xl p-6 w-full max-w-[400px] shadow-[var(--shadow-lg)] animate-[scaleIn_0.2s_ease-out_both]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--text1)] text-base font-bold">{step === 1 ? 'Select Coin' : `Add ${selectedCoin?.name}`}</h2>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text1)]"><X size={18} /></button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a coin..."
              className="w-full px-3.5 py-2.5 bg-[var(--bg-base)] border border-[var(--border-md)] rounded-lg text-[var(--text1)] text-sm outline-none focus:border-[var(--blue)] transition-colors"
            />
            <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto">
              {searching && <div className="text-[var(--text3)] text-[13px] py-2">Searching...</div>}
              {searchResults.map(coin => (
                <div 
                  key={coin.id} 
                  onClick={() => { setSelected(coin); setStep(2); }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-hover)] group"
                >
                  <img src={coin.thumb} alt={coin.name} className="w-[26px] h-[26px] rounded-full" />
                  <div className="flex-1">
                    <div className="text-[var(--text1)] text-[13px] font-semibold">{coin.name}</div>
                    <div className="text-[var(--text3)] text-[10px] font-[var(--ff-mono)] uppercase">{coin.symbol}</div>
                  </div>
                  {coin.market_cap_rank && <span className="text-[var(--text4)] text-[11px] font-[var(--ff-mono)]">#{coin.market_cap_rank}</span>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg">
              <img src={selectedCoin.thumb} alt={selectedCoin.name} className="w-7 h-7 rounded-full" />
              <div className="flex-1">
                <div className="text-[var(--text1)] text-sm font-semibold">{selectedCoin.name}</div>
                <div className="text-[var(--text3)] text-[11px] font-[var(--ff-mono)] uppercase">{selectedCoin.symbol}</div>
              </div>
              <button onClick={() => { setStep(1); setSelected(null); }} className="text-[var(--text3)] text-xs hover:text-[var(--blue)]">Change</button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">Quantity</label>
              <input 
                autoFocus type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.5"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-base)] border border-[var(--border-md)] rounded-lg text-[var(--text1)] text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[var(--text3)] text-[11px] font-bold uppercase tracking-wider">Buy Price (USD)</label>
              <input 
                type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="65000"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-base)] border border-[var(--border-md)] rounded-lg text-[var(--text1)] text-sm outline-none"
              />
            </div>

            <button
              onClick={handleAdd}
              disabled={!quantity || !buyPrice}
              className="w-full py-2.5 rounded-lg bg-[var(--blue)] text-white text-sm font-bold transition-all disabled:bg-[var(--bg-hover)] disabled:text-[var(--text4)] disabled:cursor-not-allowed hover:brightness-110"
            >
              Add to Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}