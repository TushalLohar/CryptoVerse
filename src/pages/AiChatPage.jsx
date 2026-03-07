import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Trash2, Bot, User } from 'lucide-react'
import { askClaude }    from '../utils/claudeAPI'
import { usePortfolio } from '../store/portfolioStore'
import { useWatchlist } from '../store/watchlistStore'

// Suggested questions to help user get started
const SUGGESTIONS = [
  'What is Bitcoin and how does it work?',
  'Explain DeFi in simple terms',
  'What are the risks of crypto investing?',
  'Compare Bitcoin vs Ethereum',
  'What is a crypto wallet?',
  'Explain proof of work vs proof of stake',
]

export default function AiChatPage() {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  const { holdings } = usePortfolio()
  const { ids }      = useWatchlist()

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build system prompt — give Claude context about the user's portfolio
  const buildSystemPrompt = () => {
    let prompt = `You are a helpful cryptocurrency analyst assistant built into CryptoTracker, a crypto market tracking app.

You help users understand cryptocurrency markets, coins, trading concepts, and portfolio management.
Be concise, accurate, and beginner-friendly. Use simple language unless the user seems technical.
Format responses clearly. Use bullet points for lists. Keep answers focused and practical.`

    if (holdings.length > 0) {
      prompt += `\n\nUser's portfolio holdings: ${holdings.map(h =>
        `${h.coinName} (${h.quantity} @ $${h.buyPrice})`
      ).join(', ')}.`
    }

    if (ids.length > 0) {
      prompt += `\n\nUser's watchlist coin IDs: ${ids.join(', ')}.`
    }

    prompt += '\n\nCurrent date: ' + new Date().toLocaleDateString()

    return prompt
  }

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    // Add user message to chat
    const userMsg = { role: 'user', content: userText }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      // Send full conversation history so Claude remembers context
      const reply = await askClaude(
        updated.map(m => ({ role: m.role, content: m.content })),
        buildSystemPrompt()
      )

      // Add Claude's reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      // Re-focus input after reply
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        'calc(100vh - 112px)',  // full height minus header + padding
      animation:     'fadeUp 0.25s ease-out both',
    }}>

      {/* ── Page header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   16,
      }}>
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
            <Sparkles size={18} color="var(--purple)" />
          </div>
          <div>
            <h1 style={{
              color:      'var(--text1)',
              fontSize:   22,
              fontWeight: 700,
              fontFamily: 'var(--ff-display)',
            }}>
              AI Chat Analyst
            </h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>
              Powered by Claude · Ask anything about crypto
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <ClearButton onClick={clearChat} />
        )}
      </div>

      {/* ── Chat area ── */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        background: 'var(--bg-elevated)',
        border:     '1px solid var(--border)',
        borderRadius: 16,
        padding:    20,
        display:    'flex',
        flexDirection: 'column',
        gap:        16,
      }}>

        {/* Empty state — show suggestions */}
        {messages.length === 0 && (
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            flex:           1,
            gap:            20,
          }}>
            <div style={{
              width:          56,
              height:         56,
              borderRadius:   '50%',
              background:     'rgba(168,85,247,0.12)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={24} color="var(--purple)" />
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text1)', fontWeight: 600, fontSize: 15 }}>
                Ask me anything about crypto
              </p>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>
                I can help with market analysis, coin explanations, and portfolio advice
              </p>
            </div>

            {/* Suggestion chips */}
            <div style={{
              display:        'flex',
              flexWrap:       'wrap',
              gap:            8,
              justifyContent: 'center',
              maxWidth:       600,
            }}>
              {SUGGESTIONS.map((s) => (
                <SuggestionChip
                  key={s}
                  text={s}
                  onClick={() => sendMessage(s)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {/* Loading indicator */}
        {loading && <TypingIndicator />}

        {/* Error */}
        {error && (
          <div style={{
            color:        'var(--red)',
            fontSize:     13,
            padding:      '10px 14px',
            background:   'rgba(244,63,94,0.08)',
            borderRadius: 8,
            border:       '1px solid rgba(244,63,94,0.2)',
          }}>
            Error: {error}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        display:      'flex',
        gap:          8,
        marginTop:    12,
        alignItems:   'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any coin, concept, or your portfolio... (Enter to send)"
          rows={1}
          style={{
            flex:        1,
            padding:     '11px 14px',
            background:  'var(--bg-elevated)',
            border:      '1px solid var(--border-md)',
            borderRadius: 10,
            color:       'var(--text1)',
            fontSize:    14,
            fontFamily:  'var(--ff-body)',
            outline:     'none',
            resize:      'none',
            lineHeight:  1.5,
            maxHeight:   120,
            transition:  'border-color 0.15s',
          }}
          onFocus={e  => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e   => e.target.style.borderColor = 'var(--border-md)'}
        />

        <SendButton
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        />
      </div>

    </div>
  )
}

// ── Chat message bubble ──
function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display:       'flex',
      gap:           10,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems:    'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width:          30,
        height:         30,
        borderRadius:   '50%',
        background:     isUser ? 'var(--blue)' : 'rgba(168,85,247,0.15)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
        marginTop:      2,
      }}>
        {isUser
          ? <User size={14} color="#fff" />
          : <Bot  size={14} color="var(--purple)" />
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth:     '75%',
        padding:      '10px 14px',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        background:   isUser ? 'var(--blue)' : 'var(--bg-hover)',
        border:       isUser ? 'none' : '1px solid var(--border)',
        color:        isUser ? '#fff' : 'var(--text1)',
        fontSize:     14,
        lineHeight:   1.6,
        whiteSpace:   'pre-wrap',  // preserves line breaks in Claude's response
        wordBreak:    'break-word',
      }}>
        {message.content}
      </div>
    </div>
  )
}

// ── Typing indicator — three bouncing dots ──
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width:          30,
        height:         30,
        borderRadius:   '50%',
        background:     'rgba(168,85,247,0.15)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        <Bot size={14} color="var(--purple)" />
      </div>

      <div style={{
        padding:      '12px 16px',
        borderRadius: '4px 14px 14px 14px',
        background:   'var(--bg-hover)',
        border:       '1px solid var(--border)',
        display:      'flex',
        gap:          4,
        alignItems:   'center',
      }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   'var(--text3)',
              animation:    `dotBounce 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Suggestion chip ──
function SuggestionChip({ text, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:      '7px 14px',
        borderRadius: 999,
        border:       `1px solid ${hovered ? 'var(--purple)' : 'var(--border-md)'}`,
        background:   hovered ? 'rgba(168,85,247,0.08)' : 'transparent',
        color:        hovered ? 'var(--purple)' : 'var(--text2)',
        fontSize:     12,
        fontWeight:   500,
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {text}
    </button>
  )
}

// ── Send button ──
function SendButton({ onClick, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:        42,
        height:       42,
        borderRadius: 10,
        border:       'none',
        background:   disabled ? 'var(--bg-hover)' : hovered ? '#2d7ef0' : 'var(--blue)',
        color:        disabled ? 'var(--text4)' : '#fff',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:   'all 0.15s',
        flexShrink:   0,
      }}
    >
      <Send size={16} />
    </button>
  )
}

// ── Clear chat button ──
function ClearButton({ onClick }) {
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
        padding:     '7px 12px',
        borderRadius: 8,
        border:      `1px solid ${hovered ? 'var(--red)' : 'var(--border-md)'}`,
        background:  hovered ? 'rgba(244,63,94,0.08)' : 'transparent',
        color:       hovered ? 'var(--red)' : 'var(--text3)',
        fontSize:    12,
        fontWeight:  600,
        cursor:      'pointer',
        transition:  'all 0.15s',
      }}
    >
      <Trash2 size={12} />
      Clear
    </button>
  )
}