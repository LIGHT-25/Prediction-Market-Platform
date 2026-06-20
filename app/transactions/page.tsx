"use client";

import { useState } from "react";
import {
  History,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { useTransactionStore } from "@/lib/transactionStore";

const txTypeLabels: Record<string, string> = {
  create_market: "Create Market",
  place_bet: "Place Bet",
  resolve_market: "Resolve Market",
  claim_reward: "Claim Reward",
};

export default function TransactionsPage() {
  const { transactions, clearTransactions } = useTransactionStore();
  const [filter, setFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [sortNewest, setSortNewest] = useState(true);

  const filtered = transactions
    .filter((tx) => filter === "all" || tx.status === filter)
    .sort((a, b) =>
      sortNewest
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp
    );

  const counts = {
    all: transactions.length,
    success: transactions.filter((t) => t.status === "success").length,
    pending: transactions.filter((t) => t.status === "pending").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            History of all your on-chain transactions
          </p>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={clearTransactions}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      {/* Status Filter + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {(["all", "success", "pending", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {f}
              <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortNewest(!sortNewest)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortNewest ? "Newest" : "Oldest"}
        </button>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {transactions.length === 0
              ? "No transactions yet. Create a market or place a bet to get started."
              : "No transactions match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl border border-border/50 bg-card p-4 card-hover"
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {tx.status === "success" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  {tx.status === "pending" && (
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  )}
                  {tx.status === "failed" && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{tx.description}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        tx.status === "success"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tx.status === "pending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {txTypeLabels[tx.type] || tx.type}
                    </span>
                    <span>·</span>
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    {tx.hash && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                        </span>
                      </>
                    )}
                  </div>
                  {tx.error && (
                    <p className="text-xs text-red-400 mt-1">{tx.error}</p>
                  )}
                </div>

                {/* Explorer Link */}
                {tx.explorerLink && (
                  <a
                    href={tx.explorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="View on Stellar Explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
