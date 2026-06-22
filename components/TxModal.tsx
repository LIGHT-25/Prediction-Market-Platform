"use client";

import { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { EXPLORER_URL } from "@/lib/config";
import type { TransactionRecord } from "@/types";

interface TxModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionRecord[];
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    label: "Pending",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    label: "Success",
  },
  failed: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "Failed",
  },
};

export function TxModal({ isOpen, onClose, transactions }: TxModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "success" | "failed">("all");

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered =
    activeTab === "all"
      ? transactions
      : transactions.filter((t) => t.status === activeTab);

  const counts = {
    all: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    success: transactions.filter((t) => t.status === "success").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="font-semibold">Transaction Status</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-border/30">
          {(["all", "pending", "success", "failed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab}
              <span className="ml-1 opacity-70">({counts[tab]})</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-2 max-h-[55vh]">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No {activeTab === "all" ? "" : activeTab} transactions
            </div>
          ) : (
            filtered.map((tx) => {
              const cfg = statusConfig[tx.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={tx.id}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${cfg.color} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className={`font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span>·</span>
                        <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {tx.hash && (
                        <a
                          href={`${EXPLORER_URL}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-primary hover:underline mt-1 block truncate"
                          title={tx.hash}
                        >
                          {tx.hash.slice(0, 16)}...{tx.hash.slice(-8)}
                        </a>
                      )}
                      {tx.error && (
                        <p className="text-xs text-red-400 mt-1">{tx.error}</p>
                      )}
                    </div>
                    {tx.explorerLink && (
                      <a
                        href={tx.explorerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1 rounded-md hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 text-center text-xs text-muted-foreground">
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            View on Stellar Explorer →
          </a>
        </div>
      </div>
    </div>
  );
}
