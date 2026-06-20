"use client";

import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Activity,
  ArrowRight,
  Sparkles,
  Timer,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { useMarkets } from "@/hooks/useMarkets";
import { useWalletStore } from "@/lib/walletStore";

export default function Home() {
  const { isConnected, balance, connect } = useWalletStore();
  const { data: markets, isLoading } = useMarkets();

  const activeMarkets = markets?.filter((m) => !m.resolved) || [];
  const resolvedMarkets = markets?.filter((m) => m.resolved) || [];
  const totalVolume = markets?.reduce((sum, m) => {
    return sum + Number(m.total_yes_shares) + Number(m.total_no_shares);
  }, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-primary/5 to-background mb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="relative px-8 py-16 sm:px-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Stellar Testnet</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Predict the Future
              <br />
              <span className="text-primary">on Stellar</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Create and trade prediction markets powered by Soroban smart contracts.
              Low fees, instant settlement, fully decentralized.
            </p>
            <div className="flex flex-wrap gap-3">
              {!isConnected ? (
                <button
                  onClick={connect}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Freighter to Start
                </button>
              ) : (
                <Link
                  href="/markets"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Browse Markets
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-background text-foreground font-medium hover:bg-muted transition-colors"
              >
                <Activity className="w-4 h-4" />
                Live Activity
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {[
          {
            label: "Active Markets",
            value: activeMarkets.length,
            icon: Timer,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
          },
          {
            label: "Resolved",
            value: resolvedMarkets.length,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Total Volume",
            value: `${(totalVolume / 10_000_000).toFixed(2)} XLM`,
            icon: TrendingUp,
            color: "text-violet-400",
            bg: "bg-violet-500/10",
          },
          {
            label: "Your Balance",
            value: isConnected
              ? `${Number(balance).toFixed(4)} XLM`
              : "—",
            icon: Wallet,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/50 bg-card p-4 card-hover"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Active Markets Preview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Active Markets</h2>
          <Link
            href="/markets"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
        ) : activeMarkets.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No active prediction markets yet.</p>
            {isConnected ? (
              <Link
                href="/markets"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create the First Market
              </Link>
            ) : (
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Connect Freighter to Start
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMarkets.slice(0, 6).map((market) => {
              const totalPool =
                Number(market.total_yes_shares) + Number(market.total_no_shares);
              const yesPct = totalPool > 0
                ? ((Number(market.total_yes_shares) / totalPool) * 100).toFixed(1)
                : "50.0";
              const endDate = new Date(market.expiration_date * 1000);
              const isExpired = endDate < new Date();

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
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isExpired
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {isExpired ? "Expired" : "Open"}
                    </span>
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
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Timer className="w-3 h-3" />
                    <span>
                      {isExpired
                        ? "Expired"
                        : `Ends ${endDate.toLocaleDateString()}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Wallet,
            title: "Freighter Wallet Support",
            desc: "Connect securely using your Freighter extension wallet.",
          },
          {
            icon: Trophy,
            title: "Pari-Mutuel Payouts",
            desc: "Winnings are distributed based on the total pool — the bigger the pot, the bigger the reward.",
          },
          {
            icon: Activity,
            title: "Real-Time Events",
            desc: "Track every market creation, bet, resolution, and reward claim in real time.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-border/50 bg-card p-5 card-hover"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-3">
              <f.icon className="w-4 h-4" />
            </div>
            <h3 className="font-medium mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
