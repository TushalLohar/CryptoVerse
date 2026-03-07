import { create } from 'zustand'

const KEY = 'ct_portfolio'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

// Each holding looks like:
// { id, coinId, coinName, coinSymbol, coinImage, quantity, buyPrice }
export const usePortfolio = create((set, get) => ({
  holdings: load(),

  addHolding: (holding) => {
    const updated = [...get().holdings, {
      ...holding,
      id: Date.now().toString(),  // unique id for each holding
    }]
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ holdings: updated })
  },

  removeHolding: (id) => {
    const updated = get().holdings.filter(h => h.id !== id)
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ holdings: updated })
  },

  // Edit a holding's quantity or buy price
  updateHolding: (id, changes) => {
    const updated = get().holdings.map(h =>
      h.id === id ? { ...h, ...changes } : h
    )
    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ holdings: updated })
  },
}))