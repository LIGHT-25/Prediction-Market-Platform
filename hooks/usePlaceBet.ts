"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeBet } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";
import type { PlaceBetParams } from "@/types";

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  return useMutation({
    mutationFn: async (params: PlaceBetParams) => {
      if (!address) throw new Error("Wallet not connected");

      const side = params.isYes ? "YES" : "NO";
      const txId = addTransaction({
        hash: "",
        type: "place_bet",
        status: "pending",
        timestamp: Date.now(),
        description: `Betting ${params.amount} XLM on ${side} for Market #${params.marketId}`,
      });

      try {
        const result = await placeBet(address, params);
        updateTransaction(txId, {
          hash: result.txHash,
          status: "success",
        });
        return result;
      } catch (error: any) {
        updateTransaction(txId, {
          status: "failed",
          error: error?.message || "Transaction failed",
        });
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      queryClient.invalidateQueries({ queryKey: ["market", vars.marketId] });
    },
  });
}
