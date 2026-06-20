"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllMarkets, getMarket } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import type { MarketData } from "@/types";

export function useMarkets() {
  const address = useWalletStore((s) => s.address);

  return useQuery<MarketData[]>({
    queryKey: ["markets"],
    queryFn: () => getAllMarkets(address || undefined),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useMarket(marketId: number | null) {
  const address = useWalletStore((s) => s.address);

  return useQuery<MarketData | null>({
    queryKey: ["market", marketId],
    queryFn: () => (marketId !== null ? getMarket(marketId, address || undefined) : null),
    enabled: marketId !== null,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
