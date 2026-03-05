import { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertTriangle, Info, Bell } from 'lucide-react'

// The context holds just one thing: the show() function
const ToastContext = createContext(null)

// Auto-incrementing ID for each toast
let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // useCallback so this function reference stays stable
  // without it, every render creates a new function = unnecessary re-renders
  const show = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    // Add new toast to the list
    setToasts((prev) => [...prev, { id, message, type }])
    // Auto-remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Icon and color for each toast type
  const config = {
    success: { icon: CheckCircle, color: 'var(--green)' },
    error:   { icon: AlertTriangle, color: 'var(--red)' },
    info:    { icon: Info,          color: 'var(--blue)' },
    alert:   { icon: Bell,          color: 'var(--gold)' },
  }

  return (
    <ToastContext.Provider value={show}>
      {children}

      {/* Toast container — fixed bottom right */}
      <div className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((toast) => {
          const { icon: Icon, color } = config[toast.type] || config.info
          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 px-4 py-3 rounded-xl min-w-[280px] max-w-[380px]"
              style={{
                background:  'var(--bg-elevated)',
                border:      '1px solid var(--border-md)',
                boxShadow:   'var(--shadow-lg)',
                animation:   'slideIn 0.2s ease-out both',
              }}
            >
              <Icon size={16} style={{ color, flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1 text-[13px]" style={{ color: 'var(--text-1)' }}>
                {toast.message}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// This is what components call: const toast = useToast()
// Then: toast('Message!', 'success')
export const useToast = () => useContext(ToastContext)