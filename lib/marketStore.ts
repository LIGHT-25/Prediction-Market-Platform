import { create } from "zustand";
import type { MarketData } from "@/types";

interface MarketState {
  markets: MarketData[];
  selectedMarket: MarketData | null;
  isLoading: boolean;
  error: string | null;
  setMarkets: (markets: MarketData[]) => void;
  setSelectedMarket: (market: MarketData | null) => void;
  addMarket: (market: MarketData) => void;
  updateMarket: (id: number, updates: Partial<MarketData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  markets: [],
  selectedMarket: null,
  isLoading: false,
  error: null,

  setMarkets: (markets) => set({ markets }),

  setSelectedMarket: (market) => set({ selectedMarket: market }),

  addMarket: (market) =>
    set((state) => ({
      markets: [market, ...state.markets],
    })),

  updateMarket: (id, updates) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      selectedMarket:
        state.selectedMarket?.id === id
          ? { ...state.selectedMarket, ...updates }
          : state.selectedMarket,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}));

