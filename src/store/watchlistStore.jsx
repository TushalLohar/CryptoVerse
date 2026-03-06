import { create } from 'zustand'

const KEY = 'ct_watchlist'

// Load saved watchlist from localStorage on startup
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

// create() takes a function that receives set and get
// set = update the store state
// get = read the current store state
export const useWatchlist = create((set, get) => ({
  ids: load(),  // ['bitcoin', 'ethereum', ...]

  // Toggle a coin — if already in list remove it, else add it
  toggle: (id) => {
    const current = get().ids
    const updated = current.includes(id)
      ? current.filter(x => x !== id)  // remove
      : [...current, id]               // add

    localStorage.setItem(KEY, JSON.stringify(updated))
    set({ ids: updated })
  },

  // Check if a coin is in the watchlist
  // Used by the star button to know if it should be filled or empty
  has: (id) => get().ids.includes(id),
}))