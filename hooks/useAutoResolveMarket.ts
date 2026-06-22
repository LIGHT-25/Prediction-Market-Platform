"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { autoResolveMarket } from "@/lib/stellar";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";

const ERROR_MESSAGES: Record<string, string> = {
  NoOracle: "This market does not have an oracle configured.",
  MarketNotExpired: "This market has not yet expired. Auto-resolve is only available after expiration.",
  OracleCallFailed: "Failed to fetch price from the oracle contract. The oracle may be unavailable.",
  InvalidOracle: "The oracle contract address is invalid.",
  MarketNotFound: "Market not found.",
  AlreadyResolved: "This market has already been resolved.",
};

function getErrorMessage(error: any): string {
  const msg = error?.message || "";
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(key)) return value;
  }
  return msg || "Auto-resolve transaction failed";
}

export function useAutoResolveMarket() {
  const queryClient = useQueryClient();
  const address = useWalletStore((s) => s.address);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);

  return useMutation({
    mutationFn: async ({ marketId }: { marketId: number }) => {
      if (!address) throw new Error("Wallet not connected");

      const txId = addTransaction({
        hash: "",
        type: "auto_resolve_market",
        status: "pending",
        timestamp: Date.now(),
        description: `Auto-resolving Market #${marketId} via oracle`,
      });

      try {
        const result = await autoResolveMarket(address, marketId);
        updateTransaction(txId, {
          hash: result.txHash,
          status: "success",
        });
        return result;
      } catch (error: any) {
        updateTransaction(txId, {
          status: "failed",
          error: getErrorMessage(error),
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
