"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMarketWithOracle } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";
import type { CreateMarketWithOracleParams } from "@/types";

export function useCreateMarketWithOracle() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  return useMutation({
    mutationFn: async (params: CreateMarketWithOracleParams) => {
      if (!address) throw new Error("Wallet not connected");

      const txId = addTransaction({
        hash: "",
        type: "create_market_with_oracle",
        status: "pending",
        timestamp: Date.now(),
        description: `Creating oracle market: "${params.question.substring(0, 50)}${params.question.length > 50 ? "..." : ""}"`,
      });

      try {
        const result = await createMarketWithOracle(address, params);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });
}
