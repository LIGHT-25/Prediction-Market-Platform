"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claimReward } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";

export function useClaimReward() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  return useMutation({
    mutationFn: async ({ marketId }: { marketId: number }) => {
      if (!address) throw new Error("Wallet not connected");

      const txId = addTransaction({
        hash: "",
        type: "claim_reward",
        status: "pending",
        timestamp: Date.now(),
        description: `Claiming reward for Market #${marketId}`,
      });

      try {
        const result = await claimReward(address, marketId);
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
