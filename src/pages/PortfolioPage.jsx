import { useState, useEffect }     from 'react'
import { useNavigate }             from 'react-router-dom'
import { Wallet, Plus, Trash2, X } from 'lucide-react'
import { usePortfolio }            from '../store/portfolioStore'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { fetchPortfolioCoins, fetchSearch } from '../utils/marketAPI'

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

  const [prices,     setPrices]     = useState({})  // { coinId: currentPrice }
  const [loading,    setLoading]    = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch current prices for all holdings
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

  // Calculate portfolio totals
  const totals = holdings.reduce((acc, h) => {
    const currentPrice = prices[h.coinId]
    if (currentPrice == null) return acc

    const currentValue = h.quantity * currentPrice
    const costBasis    = h.quantity * h.buyPrice
    const pnl          = currentValue - costBasis

    acc.totalValue    += currentValue
    acc.totalCost     += costBasis
    acc.totalPnl      += pnl
    return acc
  }, { totalValue: 0, totalCost: 0, totalPnl: 0 })

  const totalPnlPct = totals.totalCost > 0
    ? ((totals.totalPnl / totals.totalCost) * 100)
    : 0

  const isPnlUp = totals.totalPnl >= 0

  // Empty state
  if (!holdings.length) return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>
      <PageHeader onAdd={() => setShowAddModal(true)} />

      <div style={{
        background:    'var(--bg-elevated)',
        border:        '1px solid var(--border)',
        borderRadius:  16,
        padding:       48,
        textAlign:     'center',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           12,
        marginTop:     20,
      }}>
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   '50%',
          background:     'var(--bg-hover)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Wallet size={22} color="var(--text4)" />
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 15, fontWeight: 600 }}>
          No holdings yet
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          Add your first coin to start tracking your portfolio
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            marginTop:    8,
            padding:      '8px 20px',
            borderRadius: 8,
            border:       'none',
            background:   'var(--blue)',
            color:        '#fff',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
          }}
        >
          <Plus size={14} />
          Add Coin
        </button>
      </div>

      {showAddModal && (
        <AddHoldingModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      <PageHeader onAdd={() => setShowAddModal(true)} />

      {/* ── Summary cards ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                 12,
        marginBottom:        24,
        marginTop:           20,
      }}>
        <SummaryCard
          label="Total Value"
          value={loading ? '...' : fmtLarge(totals.totalValue)}
          valueColor="var(--text1)"
        />
        <SummaryCard
          label="Total Cost"
          value={loading ? '...' : fmtLarge(totals.totalCost)}
          valueColor="var(--text2)"
        />
        <SummaryCard
          label="Total P&L"
          value={loading ? '...' : `${isPnlUp ? '+' : ''}${fmtLarge(totals.totalPnl)} (${isPnlUp ? '+' : ''}${totalPnlPct.toFixed(2)}%)`}
          valueColor={isPnlUp ? 'var(--green)' : 'var(--red)'}
          highlight
        />
      </div>

      {/* ── Column headers ── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '32px 1fr 100px 100px 120px 100px 32px',
        gap:                 14,
        padding:             '0 18px 8px',
        alignItems:          'center',
      }}>
        <span />
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600 }}>Coin</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Qty</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Buy Price</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>Current Value</span>
        <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>P&L</span>
        <span />
      </div>

      {/* ── Holdings ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {holdings.map((holding) => {
          const currentPrice = prices[holding.coinId]
          const currentValue = currentPrice != null ? holding.quantity * currentPrice : null
          const costBasis    = holding.quantity * holding.buyPrice
          const pnl          = currentValue != null ? currentValue - costBasis : null
          const pnlPct       = pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null
          const isUp         = pnl >= 0

          return (
            <HoldingRow
              key={holding.id}
              holding={holding}
              currentPrice={currentPrice}
              currentValue={currentValue}
              costBasis={costBasis}
              pnl={pnl}
              pnlPct={pnlPct}
              isUp={isUp}
              currency={currency}
              loading={loading}
              onRemove={() => removeHolding(holding.id)}
              onClick={() => navigate(`/coin/${holding.coinId}`)}
            />
          )
        })}
      </div>

      {showAddModal && (
        <AddHoldingModal onClose={() => setShowAddModal(false)} />
      )}

    </div>
  )
}

// ── Page header ──
function PageHeader({ onAdd }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   10,
          background:     'rgba(168,85,247,0.12)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Wallet size={18} color="var(--purple)" />
        </div>
        <div>
          <h1 style={{
            color:      'var(--text1)',
            fontSize:   22,
            fontWeight: 700,
            fontFamily: 'var(--ff-display)',
          }}>
            Portfolio
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
            Track your crypto holdings and P&L
          </p>
        </div>
      </div>

      <button
        onClick={onAdd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         6,
          padding:     '8px 16px',
          borderRadius: 8,
          border:      'none',
          background:  hovered ? '#2d7ef0' : 'var(--blue)',
          color:       '#fff',
          fontSize:    13,
          fontWeight:  600,
          cursor:      'pointer',
          transition:  'background 0.15s',
        }}
      >
        <Plus size={14} />
        Add Holding
      </button>
    </div>
  )
}

// ── Summary card ──
function SummaryCard({ label, value, valueColor, highlight }) {
  return (
    <div style={{
      background:   'var(--bg-elevated)',
      border:       `1px solid ${highlight ? 'var(--border-md)' : 'var(--border)'}`,
      borderRadius: 14,
      padding:      '16px 20px',
    }}>
      <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        color:      valueColor,
        fontSize:   20,
        fontWeight: 700,
        fontFamily: 'var(--ff-mono)',
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Holding row ──
function HoldingRow({ holding, currentPrice, currentValue, pnl, pnlPct, isUp, currency, loading, onRemove, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             'grid',
        gridTemplateColumns: '32px 1fr 100px 100px 120px 100px 32px',
        gap:                 14,
        padding:             '12px 18px',
        alignItems:          'center',
        background:   hovered ? 'var(--bg-hover)'  : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {/* Logo */}
      <img
        src={holding.coinImage}
        alt={holding.coinName}
        style={{ width: 32, height: 32, borderRadius: '50%' }}
      />

      {/* Name */}
      <div>
        <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
          {holding.coinName}
        </div>
        <div style={{
          color: 'var(--text3)', fontSize: 11, marginTop: 2,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase',
        }}>
          {holding.coinSymbol}
        </div>
      </div>

      {/* Quantity */}
      <div style={{
        color:      'var(--text2)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   13,
        textAlign:  'right',
      }}>
        {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
      </div>

      {/* Buy price */}
      <div style={{
        color:      'var(--text2)',
        fontFamily: 'var(--ff-mono)',
        fontSize:   13,
        textAlign:  'right',
      }}>
        {fmtPrice(holding.buyPrice, currency)}
      </div>

      {/* Current value */}
      <div style={{
        color:      'var(--text1)',
        fontFamily: 'var(--ff-mono)',
        fontWeight: 600,
        fontSize:   14,
        textAlign:  'right',
      }}>
        {loading || currentValue == null ? '...' : fmtLarge(currentValue)}
      </div>

      {/* P&L */}
      <div style={{
        color:        loading || pnl == null ? 'var(--text3)' : isUp ? 'var(--green)' : 'var(--red)',
        fontFamily:   'var(--ff-mono)',
        fontWeight:   600,
        fontSize:     13,
        textAlign:    'right',
      }}>
        {loading || pnl == null
          ? '...'
          : `${isUp ? '+' : ''}${pnlPct?.toFixed(2)}%`
        }
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          28,
          height:         28,
          borderRadius:   6,
          border:         'none',
          background:     'transparent',
          color:          'var(--text4)',
          cursor:         'pointer',
          transition:     'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text4)'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Add Holding Modal ──
function AddHoldingModal({ onClose }) {
  const { addHolding } = usePortfolio()

  const [query,        setQuery]       = useState('')
  const [searchResults, setResults]   = useState([])
  const [selectedCoin, setSelected]   = useState(null)
  const [quantity,     setQuantity]   = useState('')
  const [buyPrice,     setBuyPrice]   = useState('')
  const [searching,    setSearching]  = useState(false)
  const [step,         setStep]       = useState(1)
  // step 1 = search for coin
  // step 2 = enter quantity and buy price

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }

    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await fetchSearch(query)
      setResults((data?.coins || []).slice(0, 6))
      setSearching(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelectCoin = (coin) => {
    setSelected(coin)
    setStep(2)
  }

  const handleAdd = () => {
    if (!selectedCoin || !quantity || !buyPrice) return

    addHolding({
      coinId:     selectedCoin.id,
      coinName:   selectedCoin.name,
      coinSymbol: selectedCoin.symbol,
      coinImage:  selectedCoin.thumb,
      quantity:   parseFloat(quantity),
      buyPrice:   parseFloat(buyPrice),
    })

    onClose()
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.6)',
        zIndex:         200,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Modal box — stopPropagation so clicks inside don't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   'var(--bg-elevated)',
          border:       '1px solid var(--border-md)',
          borderRadius: 16,
          padding:      24,
          width:        400,
          boxShadow:    'var(--shadow-lg)',
          animation:    'scaleIn 0.2s ease-out both',
        }}
      >
        {/* Modal header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   20,
        }}>
          <h2 style={{
            color:      'var(--text1)',
            fontSize:   16,
            fontWeight: 700,
          }}>
            {step === 1 ? 'Select Coin' : `Add ${selectedCoin?.name}`}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border:     'none',
              color:      'var(--text3)',
              cursor:     'pointer',
              display:    'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — coin search */}
        {step === 1 && (
          <div>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for a coin..."
              style={{
                width:        '100%',
                padding:      '10px 14px',
                background:   'var(--bg-base)',
                border:       '1px solid var(--border-md)',
                borderRadius: 8,
                color:        'var(--text1)',
                fontSize:     14,
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />

            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searching && (
                <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 0' }}>
                  Searching...
                </div>
              )}
              {searchResults.map(coin => (
                <SearchResultRow
                  key={coin.id}
                  coin={coin}
                  onSelect={() => handleSelectCoin(coin)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — quantity + buy price */}
        {step === 2 && (
          <div>
            {/* Selected coin preview */}
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          10,
              padding:      '10px 14px',
              background:   'var(--bg-base)',
              borderRadius: 8,
              marginBottom: 16,
              border:       '1px solid var(--border)',
            }}>
              <img
                src={selectedCoin.thumb}
                alt={selectedCoin.name}
                style={{ width: 28, height: 28, borderRadius: '50%' }}
              />
              <div>
                <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
                  {selectedCoin.name}
                </div>
                <div style={{
                  color: 'var(--text3)', fontSize: 11,
                  fontFamily: 'var(--ff-mono)', textTransform: 'uppercase',
                }}>
                  {selectedCoin.symbol}
                </div>
              </div>
              <button
                onClick={() => { setStep(1); setSelected(null) }}
                style={{
                  marginLeft:  'auto',
                  background:  'none',
                  border:      'none',
                  color:       'var(--text3)',
                  fontSize:    12,
                  cursor:      'pointer',
                }}
              >
                Change
              </button>
            </div>

            {/* Quantity input */}
            <label style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
              Quantity
            </label>
            <input
              autoFocus
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g. 0.5"
              style={{
                width:        '100%',
                padding:      '10px 14px',
                marginTop:    6,
                marginBottom: 14,
                background:   'var(--bg-base)',
                border:       '1px solid var(--border-md)',
                borderRadius: 8,
                color:        'var(--text1)',
                fontSize:     14,
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />

            {/* Buy price input */}
            <label style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
              Buy Price (USD)
            </label>
            <input
              type="number"
              value={buyPrice}
              onChange={e => setBuyPrice(e.target.value)}
              placeholder="e.g. 65000"
              style={{
                width:        '100%',
                padding:      '10px 14px',
                marginTop:    6,
                marginBottom: 20,
                background:   'var(--bg-base)',
                border:       '1px solid var(--border-md)',
                borderRadius: 8,
                color:        'var(--text1)',
                fontSize:     14,
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={!quantity || !buyPrice}
              style={{
                width:        '100%',
                padding:      '11px',
                borderRadius: 8,
                border:       'none',
                background:   !quantity || !buyPrice ? 'var(--bg-hover)' : 'var(--blue)',
                color:        !quantity || !buyPrice ? 'var(--text4)' : '#fff',
                fontSize:     14,
                fontWeight:   600,
                cursor:       !quantity || !buyPrice ? 'not-allowed' : 'pointer',
                transition:   'all 0.15s',
              }}
            >
              Add to Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Search result in modal ──
function SearchResultRow({ coin, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '9px 12px',
        borderRadius: 8,
        background:   hovered ? 'var(--bg-hover)' : 'transparent',
        cursor:       'pointer',
        transition:   'background 0.1s',
      }}
    >
      <img
        src={coin.thumb}
        alt={coin.name}
        style={{ width: 26, height: 26, borderRadius: '50%' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>
          {coin.name}
        </div>
        <div style={{
          color: 'var(--text3)', fontSize: 10,
          fontFamily: 'var(--ff-mono)', textTransform: 'uppercase',
        }}>
          {coin.symbol}
        </div>
      </div>
      {coin.market_cap_rank && (
        <span style={{
          color:      'var(--text4)',
          fontSize:   11,
          fontFamily: 'var(--ff-mono)',
        }}>
          #{coin.market_cap_rank}
        </span>
      )}
    </div>
  )
}