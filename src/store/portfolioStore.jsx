import { create } from "zustand";

const KEY = "ct_portfolio";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const save = (holdings) => {
  localStorage.setItem(KEY, JSON.stringify(holdings));
};

export const usePortfolio = create((set, get) => ({
  holdings: load(),

  addHolding: (holding) => {
    const updated = [
      ...get().holdings,
      { ...holding, id: Date.now().toString() },
    ];

    save(updated);
    set({ holdings: updated });
  },

  removeHolding: (id) => {
    const updated = get().holdings.filter((h) => h.id !== id);

    save(updated);
    set({ holdings: updated });
  },

  updateHolding: (id, changes) => {
    const updated = get().holdings.map((h) =>
      h.id === id ? { ...h, ...changes } : h,
    );

    save(updated);
    set({ holdings: updated });
  },
}));
