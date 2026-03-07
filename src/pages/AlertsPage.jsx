import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, X, CheckCircle } from 'lucide-react'
import { useAlerts }               from '../store/alertsStore'
import { fetchSearch }             from '../utils/marketAPI'

export default function AlertsPage() {
  const { alerts, removeAlert }  = useAlerts()
  const [showModal, setShowModal] = useState(false)

  // Request browser notification permission on page load
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const active    = alerts.filter(a => !a.triggered)
  const triggered = alerts.filter(a =>  a.triggered)

  return (
    <div style={{ animation: 'fadeUp 0.25s ease-out both' }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width:          36,
            height:         36,
            borderRadius:   10,
            background:     'rgba(61,142,248,0.12)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <Bell size={18} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{
              color:      'var(--text1)',
              fontSize:   22,
              fontWeight: 700,
              fontFamily: 'var(--ff-display)',
            }}>
              Price Alerts
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Get notified when a coin hits your target price
            </p>
          </div>
        </div>

        <AddButton onClick={() => setShowModal(true)} />
      </div>

      {/* Empty state */}
      {alerts.length === 0 && (
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
            <Bell size={22} color="var(--text4)" />
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 15, fontWeight: 600 }}>
            No alerts set
          </p>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>
            Set a target price and get notified when it's hit
          </p>
          <button
            onClick={() => setShowModal(true)}
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
            Create Alert
          </button>
        </div>
      )}

      {/* Active alerts */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel text="Active" color="var(--blue)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {active.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <div>
          <SectionLabel text="Triggered" color="var(--green)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {triggered.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
                dimmed
              />
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <AddAlertModal onClose={() => setShowModal(false)} />
      )}

    </div>
  )
}

function SectionLabel({ text, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        color,
        fontSize:  11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function AlertRow({ alert, onRemove, dimmed }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '12px 18px',
        background:   hovered ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border:       `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`,
        borderRadius: 12,
        transition:   'all 0.15s',
        opacity:      dimmed ? 0.6 : 1,
      }}
    >
      {/* Coin image */}
      <img
        src={alert.coinImage}
        alt={alert.coinName}
        style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
      />

      {/* Coin info */}
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
          {alert.coinName}
        </div>
        <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>
          Alert when price goes{' '}
          <span style={{ color: alert.direction === 'above' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {alert.direction}
          </span>
          {' '}${alert.targetPrice.toLocaleString()}
        </div>
      </div>

      {/* Target price */}
      <div style={{
        color:      'var(--text1)',
        fontFamily: 'var(--ff-mono)',
        fontWeight: 700,
        fontSize:   15,
      }}>
        ${alert.targetPrice.toLocaleString()}
      </div>

      {/* Status */}
      {alert.triggered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}>
          <CheckCircle size={14} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Hit</span>
        </div>
      )}

      {/* Direction badge */}
      {!alert.triggered && (
        <div style={{
          padding:      '3px 10px',
          borderRadius: 999,
          fontSize:     11,
          fontWeight:   700,
          background:   alert.direction === 'above' ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)',
          color:        alert.direction === 'above' ? 'var(--green)' : 'var(--red)',
        }}>
          {alert.direction === 'above' ? '↑ Above' : '↓ Below'}
        </div>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
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
          transition:     'color 0.15s',
          flexShrink:     0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text4)'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ── Add Alert Modal ──
function AddAlertModal({ onClose }) {
  const { addAlert } = useAlerts()

  const [query,        setQuery]     = useState('')
  const [results,      setResults]   = useState([])
  const [selected,     setSelected]  = useState(null)
  const [targetPrice,  setTarget]    = useState('')
  const [direction,    setDirection] = useState('above')
  const [searching,    setSearching] = useState(false)
  const [step,         setStep]      = useState(1)

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

  const handleAdd = () => {
    if (!selected || !targetPrice) return
    addAlert({
      coinId:      selected.id,
      coinName:    selected.name,
      coinSymbol:  selected.symbol,
      coinImage:   selected.thumb,
      targetPrice: parseFloat(targetPrice),
      direction,
    })
    onClose()
  }

  return (
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
      <div
        onClick={e => e.stopPropagation()}
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
          <h2 style={{ color: 'var(--text1)', fontSize: 16, fontWeight: 700 }}>
            {step === 1 ? 'Select Coin' : `Set Alert for ${selected?.name}`}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — search */}
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
              {results.map(coin => (
                <SearchResultRow
                  key={coin.id}
                  coin={coin}
                  onSelect={() => { setSelected(coin); setStep(2) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — set alert */}
        {step === 2 && (
          <div>
            {/* Selected coin */}
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
              <img src={selected.thumb} alt={selected.name}
                style={{ width: 28, height: 28, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 14 }}>
                  {selected.name}
                </div>
              </div>
              <button
                onClick={() => { setStep(1); setSelected(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
              >
                Change
              </button>
            </div>

            {/* Direction toggle */}
            <label style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
              Alert Direction
            </label>
            <div style={{
              display:      'flex',
              gap:          6,
              marginTop:    6,
              marginBottom: 14,
            }}>
              {['above', 'below'].map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  style={{
                    flex:         1,
                    padding:      '8px',
                    borderRadius: 8,
                    border:       `1px solid ${direction === d
                      ? d === 'above' ? 'var(--green)' : 'var(--red)'
                      : 'var(--border-md)'}`,
                    background:   direction === d
                      ? d === 'above' ? 'rgba(34,197,94,0.10)' : 'rgba(244,63,94,0.10)'
                      : 'transparent',
                    color:        direction === d
                      ? d === 'above' ? 'var(--green)' : 'var(--red)'
                      : 'var(--text3)',
                    fontSize:     13,
                    fontWeight:   700,
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                  }}
                >
                  {d === 'above' ? '↑ Above' : '↓ Below'}
                </button>
              ))}
            </div>

            {/* Target price */}
            <label style={{ color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
              Target Price (USD)
            </label>
            <input
              autoFocus
              type="number"
              value={targetPrice}
              onChange={e => setTarget(e.target.value)}
              placeholder="e.g. 100000"
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

            <button
              onClick={handleAdd}
              disabled={!targetPrice}
              style={{
                width:        '100%',
                padding:      '11px',
                borderRadius: 8,
                border:       'none',
                background:   !targetPrice ? 'var(--bg-hover)' : 'var(--blue)',
                color:        !targetPrice ? 'var(--text4)' : '#fff',
                fontSize:     14,
                fontWeight:   600,
                cursor:       !targetPrice ? 'not-allowed' : 'pointer',
                transition:   'all 0.15s',
              }}
            >
              Create Alert
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

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
      <img src={coin.thumb} alt={coin.name}
        style={{ width: 26, height: 26, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--text1)', fontSize: 13, fontWeight: 600 }}>{coin.name}</div>
        <div style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--ff-mono)', textTransform: 'uppercase' }}>
          {coin.symbol}
        </div>
      </div>
      {coin.market_cap_rank && (
        <span style={{ color: 'var(--text4)', fontSize: 11, fontFamily: 'var(--ff-mono)' }}>
          #{coin.market_cap_rank}
        </span>
      )}
    </div>
  )
}

function AddButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
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
      New Alert
    </button>
  )
}