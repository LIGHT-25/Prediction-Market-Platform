import { create } from "zustand";
import type { ContractEvent } from "@/types";

interface EventState {
  events: ContractEvent[];
  lastLedger: number | null;
  isPolling: boolean;
  setEvents: (events: ContractEvent[]) => void;
  addEvents: (events: ContractEvent[]) => void;
  setLastLedger: (ledger: number) => void;
  setPolling: (polling: boolean) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  lastLedger: null,
  isPolling: false,

  setEvents: (events) => set({ events }),

  addEvents: (newEvents) =>
    set((state) => {
      const existingIds = new Set(state.events.map((e) => e.id));
      const unique = newEvents.filter((e) => !existingIds.has(e.id));
      return {
        events: [...unique, ...state.events].slice(0, 200), // Keep last 200
      };
    }),

  setLastLedger: (ledger) => set({ lastLedger: ledger }),

  setPolling: (polling) => set({ isPolling: polling }),

  clearEvents: () => set({ events: [], lastLedger: null }),
}));
