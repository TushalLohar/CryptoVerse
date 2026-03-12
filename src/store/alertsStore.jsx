import { create } from "zustand";

const KEY = "ct_alerts";

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const save = (alerts) => {
  localStorage.setItem(KEY, JSON.stringify(alerts));
};

export const useAlerts = create((set, get) => ({
  alerts: load(),

  addAlert: (alert) => {
    const updated = [
      ...get().alerts,
      { ...alert, id: Date.now().toString(), triggered: false },
    ];

    save(updated);
    set({ alerts: updated });
  },

  removeAlert: (id) => {
    const updated = get().alerts.filter((a) => a.id !== id);

    save(updated);
    set({ alerts: updated });
  },

  triggerAlert: (id) => {
    const updated = get().alerts.map((a) =>
      a.id === id ? { ...a, triggered: true } : a,
    );

    save(updated);
    set({ alerts: updated });
  },
}));
