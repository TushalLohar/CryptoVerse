import { create } from 'zustand'

const KEY = 'ct_alerts'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

// Each alert looks like:
// { id, coinId, coinName, coinSymbol, coinImage, targetPrice, direction, triggered }
// direction: 'above' = alert when price goes above target
//            'below' = alert when price goes below target
export const useAlerts = create((set, get) => ({
  alerts: load(),

  addAlert: (alert) => {
    const updated = [...get().alerts, {
      ...alert,
      id:        Date.now().toString(),
      triggered: false,
    }]
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ alerts: updated })
  },

  removeAlert: (id) => {
    const updated = get().alerts.filter(a => a.id !== id)
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ alerts: updated })
  },

  // Mark alert as triggered so it doesn't fire again
  triggerAlert: (id) => {
    const updated = get().alerts.map(a =>
      a.id === id ? { ...a, triggered: true } : a
    )
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ alerts: updated })
  },
}))