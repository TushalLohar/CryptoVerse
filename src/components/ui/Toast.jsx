import { createContext, useContext, useState } from "react";
import { X, CheckCircle, AlertTriangle, Info, Bell } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function show(message, type = "info", duration = 4000) {
    const id = ++toastId;

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const config = {
    success: { icon: CheckCircle, color: "text-crypto-green" },
    error: { icon: AlertTriangle, color: "text-crypto-red" },
    info: { icon: Info, color: "text-crypto-blue" },
    alert: { icon: Bell, color: "text-crypto-gold" },
  };

  return (
    <ToastContext.Provider value={show}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-24 right-4 z-9999 flex flex-col gap-2">
        {toasts.map((toast) => {
          const { icon: Icon, color } = config[toast.type] || config.info;

          return (
            <div
              key={toast.id}
              className="flex items-start gap-3 px-4 py-3 rounded-xl min-w-70 max-w-95 bg-bg-elevated border border-border-md shadow-premium animate-scale-in"
            >
              <Icon size={16} className={`${color} mt-0.5`} />

              <div className="flex-1 text-[13px] text-text-1">
                {toast.message}
              </div>

              <button
                onClick={() => dismiss(toast.id)}
                className="text-text-3 hover:text-text-1"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
