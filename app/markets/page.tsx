"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Search,
  Plus,
  Timer,
  CheckCircle2,
  X,
} from "lucide-react";
import { useMarkets } from "@/hooks/useMarkets";
import { useCreateMarket } from "@/hooks/useCreateMarket";
import { useWalletStore } from "@/lib/walletStore";
import { useToast } from "@/components/Toast";
import { NATIVE_TOKEN_ADDRESS } from "@/lib/config";

export default function MarketsPage() {
  const { address, isConnected, connect } = useWalletStore();
  const { data: markets, isLoading } = useMarkets();
  const createMarket = useCreateMarket();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [expirationDays, setExpirationDays] = useState("7");

  const filteredMarkets = (markets || []).filter((m) => {
    const matchesSearch = m.question
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && !m.resolved) ||
      (filter === "resolved" && m.resolved);
    return matchesSearch && matchesFilter;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast("Please connect your wallet first", "error");
      return;
    }
    if (!question.trim()) {
      toast("Please enter a question", "error");
      return;
    }

    const days = parseInt(expirationDays);
    if (isNaN(days) || days < 1) {
      toast("Please enter a valid number of days", "error");
      return;
    }

    // Current ledger timestamp + days in seconds
    const expirationDate = Math.floor(Date.now() / 1000) + days * 86400;

    try {
      await createMarket.mutateAsync({
        question: question.trim(),
        description: description.trim(),
        expirationDate,
        token: NATIVE_TOKEN_ADDRESS,
      });
      toast("Market created successfully!", "success");
      setQuestion("");
      setDescription("");
      setExpirationDays("7");
      setShowCreate(false);
    } catch (error: unknown) {
      toast((error as Error)?.message || "Failed to create market", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted-foreground">
            Browse and trade prediction markets
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showCreate ? (
              <>
                <X className="w-4 h-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Market
              </>
            )}
          </button>
        )}
      </div>

      {/* Create Market Form */}
      {showCreate && (
        <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Create New Market
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder='e.g. "Will BTC reach $100k by end of 2026?"'
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context for this prediction market..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  min="1"
                  max="365"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Token
                </label>
                <input
                  type="text"
                  value="Native XLM"
                  disabled
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={createMarket.isPending}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMarket.isPending ? "Creating..." : "Create Market"}
            </button>
          </form>
        </section>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card p-6 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {search
              ? "No markets match your search."
              : "No prediction markets yet."}
          </p>
          {isConnected && !search && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create the First Market
            </button>
          )}
            {!isConnected && (
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Connect Freighter
              </button>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarkets.map((market) => {
            const totalPool =
              Number(market.total_yes_shares) + Number(market.total_no_shares);
            const yesPct =
              totalPool > 0
                ? ((Number(market.total_yes_shares) / totalPool) * 100).toFixed(1)
                : "50.0";
            const endDate = new Date(market.expiration_date * 1000);
            const isExpired = endDate < new Date();
            const isResolved = market.resolved;

            return (
              <Link
                key={market.id}
                href={`/markets/detail?id=${market.id}`}
                className="rounded-xl border border-border/50 bg-card p-5 card-hover group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-mono">
                    #{market.id}
                  </span>
                  <div className="flex gap-1.5">
                    {isResolved && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400">
                        {market.outcome ? "YES ✓" : "NO ✓"}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isResolved
                          ? "bg-emerald-500/10 text-emerald-400"
                          : isExpired
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-sky-500/10 text-sky-400"
                      }`}
                    >
                      {isResolved ? "Resolved" : isExpired ? "Expired" : "Open"}
                    </span>
                  </div>
                </div>
                <p className="font-medium mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {market.question}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>YES {yesPct}%</span>
                    <span>NO {(100 - Number(yesPct)).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${yesPct}%` }}
                    />
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${100 - Number(yesPct)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isResolved ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Timer className="w-3 h-3" />
                    )}
                    <span>
                      {isResolved
                        ? "Resolved"
                        : isExpired
                        ? "Expired"
                        : `Ends ${endDate.toLocaleDateString()}`}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(totalPool / 10_000_000).toFixed(2)} XLM pool
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
