"use client";

import { useEffect, useState } from "react";
import { useWalletStore } from "@/lib/walletStore";
import { useMarkets } from "@/hooks/useMarkets";
import { useTransactionStore } from "@/lib/transactionStore";
import {
  Wallet,
  Copy,
  ExternalLink,
  CheckCircle2,
  Timer,
  Trophy,
  TrendingUp,
  BarChart3,
  Users,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { EXPLORER_URL } from "@/lib/config";
import { getAnalytics, getUserPredictionHistory } from "@/lib/stellar";
import type { AnalyticsData, UserPrediction } from "@/types";
import Link from "next/link";

export default function Dashboard() {
  const { address, isConnected, balance, isLoading, connect, fetchBalance } =
    useWalletStore();
  const { toast } = useToast();
  const { data: markets } = useMarkets();
  const transactions = useTransactionStore((s) => s.transactions);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
      getAnalytics(address || undefined).then(setAnalytics).catch(() => {});
      loadPredictions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, fetchBalance]);

  const loadPredictions = async () => {
    if (!address) return;
    setPredLoading(true);
    try {
      const data = await getUserPredictionHistory(address);
      setPredictions(data);
    } catch {
      // ignore
    }
    setPredLoading(false);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast("Address copied!", "success");
    }
  };

  const myMarkets = markets?.filter((m) => m.creator === address) || [];
  const pendingTx = transactions.filter((t) => t.status === "pending");
  const recentTx = transactions.slice(0, 5);

  // User prediction stats
  const wins = predictions.filter((p) => p.won === true).length;
  const losses = predictions.filter((p) => p.won === false).length;
  const totalStaked = predictions.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground mb-6">
            Connect Freighter to view your dashboard, analytics, and prediction history.
          </p>
          <button
            onClick={connect}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Wallet className="w-4 h-4" />
            {isLoading ? "Opening Freighter..." : "Connect Freighter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Wallet Info */}
      <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4" /> Wallet Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Address</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={copyAddress}
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={`${EXPLORER_URL}/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className="text-lg font-semibold">{balance} XLM</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Network</p>
            <div className="flex items-center gap-2">
              <span className="status-dot status-dot-success" />
              <span className="text-sm font-medium">Stellar Testnet</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">My Markets</p>
            <p className="text-lg font-semibold">{myMarkets.length}</p>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Platform Analytics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-sky-500/10">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-muted-foreground">Total Markets</span>
            </div>
            <p className="text-xl font-bold">{analytics?.totalMarkets || markets?.length || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-violet-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-muted-foreground">Predictions</span>
            </div>
            <p className="text-xl font-bold">{analytics?.totalPredictions || 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Total Volume</span>
            </div>
            <p className="text-xl font-bold">{analytics?.totalVolumeXLM.toFixed(2) || "0"} XLM</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">Active Markets</span>
            </div>
            <p className="text-xl font-bold">
              {markets?.filter((m) => !m.resolved).length || 0}
            </p>
          </div>
        </div>
        {analytics?.mostActiveMarket && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Most Active: </span>
            <Link
              href={`/markets/${analytics.mostActiveMarket.id}`}
              className="text-primary hover:underline"
            >
              {analytics.mostActiveMarket.question.substring(0, 60)}
            </Link>
          </div>
        )}
      </section>

      {/* User Prediction History / Profile */}
      <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" /> My Prediction History
          </h2>
          <button
            onClick={loadPredictions}
            disabled={predLoading}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${predLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Win/Loss Stats */}
        {predictions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-2xl font-bold text-emerald-400">{wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 text-center">
              <p className="text-2xl font-bold text-red-400">{losses}</p>
              <p className="text-xs text-muted-foreground">Losses</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-2xl font-bold text-primary">{totalStaked.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Staked (XLM)</p>
            </div>
          </div>
        )}

        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {predLoading ? "Loading..." : "No predictions yet. Go to Markets to place your first bet!"}
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {predictions.map((p, i) => (
              <Link
                key={`${p.marketId}-${p.isYes}-${i}`}
                href={`/markets/${p.marketId}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.question}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.isYes ? "YES" : "NO"} · {p.amount} XLM
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {p.resolved ? (
                    p.won ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                        Won
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                        Lost
                      </span>
                    )
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                      Open
                    </span>
                  )}
                  {p.claimed && (
                    <span className="text-xs text-emerald-400">✓</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats + Recent TX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stats Cards */}
        <section className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Quick Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Active Markets",
                value: markets?.filter((m) => !m.resolved).length || 0,
                icon: Timer,
                color: "text-sky-400",
                bg: "bg-sky-500/10",
              },
              {
                label: "Resolved Markets",
                value: markets?.filter((m) => m.resolved).length || 0,
                icon: CheckCircle2,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Pending TX",
                value: pendingTx.length,
                icon: Timer,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Total TX",
                value: transactions.length,
                icon: BarChart3,
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border/30 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${stat.bg}`}>
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Transactions
            </h2>
            <Link
              href="/transactions"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No transactions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`status-dot shrink-0 ${
                        tx.status === "success"
                          ? "status-dot-success"
                          : tx.status === "pending"
                          ? "status-dot-pending"
                          : "status-dot-failed"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
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
                    {tx.explorerLink && (
                      <a
                        href={tx.explorerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* My Markets */}
      <section className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4" /> My Markets
          </h2>
          <Link
            href="/markets"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Create Market <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {myMarkets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            You haven&apos;t created any markets yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myMarkets.map((market) => (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{market.question}</p>
                  <p className="text-xs text-muted-foreground">
                    #{market.id} · {market.resolved ? "Resolved" : "Active"}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                    market.resolved
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-sky-500/10 text-sky-400"
                  }`}
                >
                  {market.resolved ? (market.outcome ? "YES ✓" : "NO ✓") : "Open"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
