import { create } from 'zustand'

const STORAGE_KEY = 'ct_watchlist'

const loadIds = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export const useWatchlist = create((set, get) => ({
  ids: loadIds(),

  // Toggle: if already in list → remove, if not → add
  toggle: (id) => {
    const ids = get().ids.includes(id)
      ? get().ids.filter((x) => x !== id)
      : [...get().ids, id]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    set({ ids })
  },

  // Check if a coin is in the watchlist
  has: (id) => get().ids.includes(id),
}))