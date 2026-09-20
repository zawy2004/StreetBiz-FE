import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GeoPoint } from '@/core/api/commerce-api';
import { NO_DISCOVERY_FILTERS, type DiscoveryFilters } from './discovery-filters';
import { detectPosition, LocateError, type LocateFailure } from './geolocation';

export type LocateStatus = 'IDLE' | 'LOCATING' | 'OK' | LocateFailure;

type DiscoveryState = {
  /** Kept in memory only: a location is not something to write to storage. */
  position: GeoPoint | null;
  locateStatus: LocateStatus;
  filters: DiscoveryFilters;

  locate: () => Promise<void>;
  clearPosition: () => void;
  setFilters: (patch: Partial<DiscoveryFilters>) => void;
  /** Clears the chip filters and keeps the chosen service area. */
  resetFilters: () => void;
};

/**
 * What a customer has told discovery so far -- where they are, which area they picked and how they
 * narrowed the lists -- shared by the Explore and Search screens so it survives moving between them.
 */
export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      position: null,
      locateStatus: 'IDLE',
      filters: NO_DISCOVERY_FILTERS,

      locate: async () => {
        if (get().locateStatus === 'LOCATING') return;
        set({ locateStatus: 'LOCATING' });
        try {
          set({ position: await detectPosition(), locateStatus: 'OK' });
        } catch (error) {
          set({ locateStatus: error instanceof LocateError ? error.reason : 'FAILED' });
        }
      },
      clearPosition: () =>
        // A radius only makes sense around a position, so it goes with it.
        set((s) => ({
          position: null,
          locateStatus: 'IDLE',
          filters: { ...s.filters, radiusMeters: null },
        })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set((s) => ({ filters: { ...NO_DISCOVERY_FILTERS, wardId: s.filters.wardId } })),
    }),
    {
      name: 'streetbiz-discovery',
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ filters }) => ({ filters }),
    },
  ),
);
