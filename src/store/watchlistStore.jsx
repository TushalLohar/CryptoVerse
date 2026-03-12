import { create } from "zustand";

const KEY = "ct_watchlist";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const save = (ids) => {
  localStorage.setItem(KEY, JSON.stringify(ids));
};

export const useWatchlist = create((set, get) => ({
  ids: load(),

  toggle: (id) => {
    const current = get().ids;

    const updated = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];

    save(updated);
    set({ ids: updated });
  },

  has: (id) => get().ids.includes(id),
}));
