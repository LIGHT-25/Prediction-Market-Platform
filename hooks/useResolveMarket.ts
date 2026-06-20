"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resolveMarket } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";

export function useResolveMarket() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  return useMutation({
    mutationFn: async ({
      marketId,
      outcome,
    }: {
      marketId: number;
      outcome: boolean;
    }) => {
      if (!address) throw new Error("Wallet not connected");

      const txId = addTransaction({
        hash: "",
        type: "resolve_market",
        status: "pending",
        timestamp: Date.now(),
        description: `Resolving Market #${marketId} as ${outcome ? "YES" : "NO"}`,
      });

      try {
        const result = await resolveMarket(address, marketId, outcome);
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
