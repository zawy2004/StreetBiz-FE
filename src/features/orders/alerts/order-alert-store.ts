import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type OrderAlertState = {
  /**
   * Announce new orders: a chime, and a system notification when the tab is
   * hidden. One switch, because a seller thinks "tell me", not in channels.
   * Kept per browser, so the stall's tablet and the owner's phone can differ.
   */
  alerts: boolean;
  /** Whether the realtime socket is up; polling covers for it when it is not. */
  live: boolean;
  setAlerts: (alerts: boolean) => void;
  setLive: (live: boolean) => void;
};

export const useOrderAlertStore = create<OrderAlertState>()(
  persist(
    (set) => ({
      alerts: true,
      live: false,
      setAlerts: (alerts) => set({ alerts }),
      setLive: (live) => set({ live }),
    }),
    {
      name: 'streetbiz-order-alerts',
      // The socket state is about this tab, right now: never restore it.
      partialize: ({ alerts }) => ({ alerts }),
    },
  ),
);
