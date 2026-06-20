"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Timer,
  CheckCircle2,
  Trophy,
  Wallet,
  AlertTriangle,
  ExternalLink,
  User,
  Users,
  TrendingUp,
} from "lucide-react";
import { useMarket } from "@/hooks/useMarkets";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { useResolveMarket } from "@/hooks/useResolveMarket";
import { useClaimReward } from "@/hooks/useClaimReward";
import { useWalletStore } from "@/lib/walletStore";
import { useToast } from "@/components/Toast";
import { EXPLORER_URL } from "@/lib/config";
import { getUserPosition } from "@/lib/stellar";
import type { UserPositionData } from "@/types";

function MarketDetailContent() {
  const searchParams = useSearchParams();
  const marketId = parseInt(searchParams.get("id") || "");
  const { address, isConnected, connect } = useWalletStore();
  const { toast } = useToast();
  const { data: market, isLoading } = useMarket(marketId);
  const placeBet = usePlaceBet();
  const resolveMarket = useResolveMarket();
  const claimReward = useClaimReward();

  const [betAmount, setBetAmount] = useState("10");
  const [userPosition, setUserPosition] = useState<UserPositionData | null>(null);

  useEffect(() => {
    if (address && marketId) {
      getUserPosition(marketId, address).then(setUserPosition).catch(() => {});
    }
  }, [address, marketId, placeBet.isSuccess, claimReward.isSuccess]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Market Not Found</h2>
        <p className="text-muted-foreground mb-6">
          This market does not exist or was removed.
        </p>
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </Link>
      </div>
    );
  }

  const totalPool =
    Number(market.total_yes_shares) + Number(market.total_no_shares);
  const yesPct =
    totalPool > 0
      ? ((Number(market.total_yes_shares) / totalPool) * 100).toFixed(1)
      : "50.0";
  const noPct = (100 - Number(yesPct)).toFixed(1);
  const endDate = new Date(market.expiration_date * 1000);
  const isExpired = endDate < new Date();

  const handlePlaceBet = async (isYes: boolean) => {
    if (!address) {
      toast("Please connect your wallet", "error");
      return;
    }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    try {
      await placeBet.mutateAsync({ marketId, isYes, amount: betAmount });
      toast(`Bet placed on ${isYes ? "YES" : "NO"}!`, "success");
    } catch (error: unknown) {
      toast((error as Error)?.message || "Bet failed", "error");
    }
  };

  const handleResolve = async (outcome: boolean) => {
    try {
      await resolveMarket.mutateAsync({ marketId, outcome });
      toast(`Market resolved as ${outcome ? "YES" : "NO"}!`, "success");
    } catch (error: unknown) {
      toast((error as Error)?.message || "Resolution failed", "error");
    }
  };

  const handleClaim = async () => {
    try {
      await claimReward.mutateAsync({ marketId });
      toast("Reward claimed!", "success");
    } catch (error: unknown) {
      toast((error as Error)?.message || "Claim failed", "error");
    }
  };

  const isCreator = address === market.creator;
  const poolXLM = (totalPool / 10_000_000).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <Link
        href="/markets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </Link>

      {/* Market Header */}
      <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-mono">Market #{market.id}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {market.creator.slice(0, 4)}...{market.creator.slice(-4)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{market.question}</h1>
            {market.description && (
              <p className="text-sm text-muted-foreground mt-2">{market.description}</p>
            )}
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
              market.resolved
                ? "bg-emerald-500/10 text-emerald-400"
                : isExpired
                ? "bg-amber-500/10 text-amber-400"
                : "bg-sky-500/10 text-sky-400"
            }`}
          >
            {market.resolved
              ? `Resolved: ${market.outcome ? "YES" : "NO"}`
              : isExpired
              ? "Expired"
              : "Open"}
          </span>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Pool
            </p>
            <p className="text-lg font-bold">{poolXLM} XLM</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
              YES Pool
            </p>
            <p className="text-lg font-bold text-emerald-400">
              {(Number(market.total_yes_shares) / 10_000_000).toFixed(2)} XLM
            </p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
              NO Pool
            </p>
            <p className="text-lg font-bold text-red-400">
              {(Number(market.total_no_shares) / 10_000_000).toFixed(2)} XLM
            </p>
          </div>
        </div>

        {/* Probability Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-400 font-medium">YES {yesPct}%</span>
            <span className="text-red-400 font-medium">NO {noPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${noPct}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {market.resolved ? (
            <span>Resolved</span>
          ) : isExpired ? (
            <span className="text-amber-400">Expired — Ready to resolve</span>
          ) : (
            <span>
              Expires {endDate.toLocaleDateString()} at{" "}
              {endDate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </section>

      {/* User Position */}
      {userPosition && (Number(userPosition.yes_shares) > 0 || Number(userPosition.no_shares) > 0) && (
        <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Your Position
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <p className="text-xs text-emerald-400">YES Shares</p>
              <p className="text-lg font-bold">
                {(Number(userPosition.yes_shares) / 10_000_000).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3">
              <p className="text-xs text-red-400">NO Shares</p>
              <p className="text-lg font-bold">
                {(Number(userPosition.no_shares) / 10_000_000).toFixed(2)}
              </p>
            </div>
          </div>
          {userPosition.claimed && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Reward claimed
            </p>
          )}
        </section>
      )}

      {/* Actions */}
      {!market.resolved && (
        <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="font-semibold mb-4">Place a Bet</h2>
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Amount (XLM)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="1"
              step="1"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePlaceBet(true)}
              disabled={placeBet.isPending || !isConnected}
              className="py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {placeBet.isPending ? "Processing..." : "Bet YES"}
            </button>
            <button
              onClick={() => handlePlaceBet(false)}
              disabled={placeBet.isPending || !isConnected}
              className="py-3 rounded-xl bg-red-500/20 text-red-400 font-medium border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {placeBet.isPending ? "Processing..." : "Bet NO"}
            </button>
          </div>
          {!isConnected && (
            <button
              onClick={connect}
              className="w-full mt-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Wallet className="w-4 h-4 inline mr-1.5" /> Connect Freighter to Bet
            </button>
          )}
        </section>
      )}

      {/* Resolve (creator only) */}
      {isCreator && !market.resolved && isExpired && (
        <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="font-semibold mb-2">Resolve Market</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This market has expired. Select the winning outcome.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleResolve(true)}
              disabled={resolveMarket.isPending}
              className="py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {resolveMarket.isPending ? "Processing..." : "Resolve YES ✓"}
            </button>
            <button
              onClick={() => handleResolve(false)}
              disabled={resolveMarket.isPending}
              className="py-3 rounded-xl bg-red-500/20 text-red-400 font-medium border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {resolveMarket.isPending ? "Processing..." : "Resolve NO ✗"}
            </button>
          </div>
        </section>
      )}

      {/* Claim Reward */}
      {market.resolved && (
        <section className="rounded-xl border border-border/50 bg-card p-6 mb-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Claim Reward
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {market.outcome
              ? "YES won this market. Claim your reward if you held YES shares."
              : "NO won this market. Claim your reward if you held NO shares."}
          </p>
          <button
            onClick={handleClaim}
            disabled={claimReward.isPending || !isConnected || userPosition?.claimed}
            className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {claimReward.isPending
              ? "Processing..."
              : userPosition?.claimed
              ? "Already Claimed"
              : "Claim Reward"}
          </button>
          {!isConnected && (
            <button
              onClick={connect}
              className="w-full mt-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Connect Freighter to Claim
            </button>
          )}
        </section>
      )}

      {/* Creator Info */}
      <section className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{market.participants} participant{market.participants !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Created by</p>
              <a
                href={`${EXPLORER_URL}/account/${market.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <a
            href={`${EXPLORER_URL}/contract/${market.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Token: {market.token.slice(0, 4)}...{market.token.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>
    </div>
  );
}

export default function MarketDetailPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div>
    }>
      <MarketDetailContent />
    </Suspense>
  );
}
