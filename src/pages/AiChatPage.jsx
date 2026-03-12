import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, Trash2, Bot, User } from "lucide-react"

import { askClaude } from "../utils/claudeAPI"
import { usePortfolio } from "../store/portfolioStore"
import { useWatchlist } from "../store/watchlistStore"

const SUGGESTIONS = [
  "What is Bitcoin and how does it work?",
  "Explain DeFi in simple terms",
  "What are the risks of crypto investing?",
  "Compare Bitcoin vs Ethereum",
  "What is a crypto wallet?",
]

export default function AiChatPage() {

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const { holdings } = usePortfolio()
  const { ids } = useWatchlist()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function buildSystemPrompt() {

    let prompt = `
You are a helpful crypto assistant inside CryptoTracker.
Explain crypto concepts clearly for beginners.
Use simple language and bullet points when needed.
`

    if (holdings.length > 0) {
      prompt += `\nUser portfolio: ${holdings
        .map(h => `${h.coinName} (${h.quantity})`)
        .join(", ")}`
    }

    if (ids.length > 0) {
      prompt += `\nWatchlist: ${ids.join(", ")}`
    }

    return prompt
  }

  async function sendMessage(text) {

    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg = { role: "user", content: userText }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {

      const reply = await askClaude(
        [...messages, userMsg],
        buildSystemPrompt()
      )

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: reply }
      ])

    } catch (err) {
      console.error(err)
    }

    setLoading(false)

    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function clearChat() {
    setMessages([])
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-up">

      {/* Header */}

      <div className="flex justify-between items-center mb-4">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Sparkles size={18} className="text-purple-500" />
          </div>

          <div>
            <h1 className="text-text-1 text-xl font-bold">
              AI Chat Analyst
            </h1>
            <p className="text-text-3 text-sm">
              Powered by Claude
            </p>
          </div>

        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1 text-sm text-text-3 hover:text-red-500"
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}

      </div>

      {/* Chat Box */}

      <div className="flex-1 overflow-y-auto bg-bg-elevated border border-border rounded-xl p-5 flex flex-col gap-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">

            <Sparkles size={32} className="text-purple-500" />

            <p className="text-text-2 text-sm">
              Ask anything about crypto
            </p>

            <div className="flex flex-wrap gap-2 justify-center max-w-xl">

              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1 text-xs border border-border rounded-full hover:border-purple-500 hover:text-purple-500"
                >
                  {s}
                </button>
              ))}

            </div>

          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />

      </div>

      {/* Input */}

      <div className="flex gap-2 mt-3">

        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about crypto..."
          className="flex-1 bg-bg-elevated border border-border-md rounded-lg px-3 py-2 text-sm text-text-1 outline-none focus:border-crypto-blue resize-none"
        />

        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-crypto-blue text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>

      </div>

    </div>
  )
}

function ChatBubble({ message }) {

  const isUser = message.role === "user"

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>

      <div className={`w-7 h-7 rounded-full flex items-center justify-center
        ${isUser ? "bg-crypto-blue" : "bg-purple-500/20"}`}>

        {isUser
          ? <User size={14} className="text-white" />
          : <Bot size={14} className="text-purple-500" />
        }

      </div>

      <div
        className={`
        max-w-[70%] px-3 py-2 text-sm rounded-lg whitespace-pre-wrap
        ${isUser
          ? "bg-crypto-blue text-white"
          : "bg-bg-hover border border-border text-text-1"}
        `}
      >
        {message.content}
      </div>

    </div>
  )
}

function TypingIndicator() {

  return (
    <div className="flex gap-2 items-center">

      <Bot size={16} className="text-purple-500" />

      <div className="flex gap-1">
        <span className="w-2 h-2 bg-text-3 rounded-full animate-bounce"></span>
        <span className="w-2 h-2 bg-text-3 rounded-full animate-bounce delay-150"></span>
        <span className="w-2 h-2 bg-text-3 rounded-full animate-bounce delay-300"></span>
      </div>

    </div>
  )
}