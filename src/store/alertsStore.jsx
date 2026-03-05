import { create } from 'zustand'

const STORAGE_KEY = 'ct_alerts'

// Load alerts from localStorage on startup
const loadAlerts = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

// Each alert: { id, coinId, coinName, coinSymbol, coinImage,
//               targetPrice, direction, currency, createdAt, triggered }
export const useAlerts = create((set, get) => ({
  alerts: loadAlerts(),

  addAlert: (coinId, coinName, coinSymbol, coinImage, targetPrice, direction, currency) => {
    const alert = {
      id:           Date.now(),
      coinId,
      coinName,
      coinSymbol,
      coinImage,
      targetPrice:  Number(targetPrice),
      direction,    // 'above' | 'below'
      currency,
      createdAt:    Date.now(),
      triggered:    false,
    }
    const alerts = [...get().alerts, alert]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    set({ alerts })
    return alert
  },

  removeAlert: (id) => {
    const alerts = get().alerts.filter((a) => a.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    set({ alerts })
  },

  triggerAlert: (id) => {
    const alerts = get().alerts.map((a) =>
      a.id === id ? { ...a, triggered: true } : a
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
    set({ alerts })
  },
}))