import { create } from "zustand";
import type { TransactionRecord } from "@/types";
import { EXPLORER_URL } from "./config";

interface TransactionState {
  transactions: TransactionRecord[];
  addTransaction: (tx: Omit<TransactionRecord, "id" | "explorerLink">) => string;
  updateTransaction: (id: string, updates: Partial<TransactionRecord>) => void;
  getTransaction: (id: string) => TransactionRecord | undefined;
  clearTransactions: () => void;
}

let txCounter = 0;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],

  addTransaction: (tx) => {
    const id = `tx-${Date.now()}-${++txCounter}`;
    const record: TransactionRecord = {
      ...tx,
      id,
      explorerLink: tx.hash ? `${EXPLORER_URL}/tx/${tx.hash}` : "",
    };
    set((state) => ({
      transactions: [record, ...state.transactions],
    }));
    return id;
  },

  updateTransaction: (id, updates) =>
    set((state) => ({
      transactions: state.transactions.map((tx) => {
        if (tx.id !== id) return tx;
        const updated = { ...tx, ...updates };
        if (updates.hash && !tx.explorerLink) {
          updated.explorerLink = `${EXPLORER_URL}/tx/${updates.hash}`;
        }
        return updated;
      }),
    })),

  getTransaction: (id) => get().transactions.find((tx) => tx.id === id),

  clearTransactions: () => set({ transactions: [] }),
}));

