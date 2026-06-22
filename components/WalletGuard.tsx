"use client";

import { Wallet, AlertTriangle } from "lucide-react";
import { useWalletStore } from "@/lib/walletStore";
import { NETWORK_PASSPHRASE } from "@/lib/config";

interface WalletGuardProps {
  children: React.ReactNode;
  message?: string;
}

export function WalletGuard({
  children,
  message = "Connect your wallet to continue.",
}: WalletGuardProps) {
  const { isConnected, isLoading, network, connect } = useWalletStore();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">Wallet Required</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <button
          onClick={connect}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Wallet className="w-4 h-4" />
          {isLoading ? "Connecting..." : "Connect Freighter"}
        </button>
      </div>
    );
  }

  // Network mismatch warning
  if (network && network !== NETWORK_PASSPHRASE) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h3 className="font-semibold text-amber-400 mb-1">Network Mismatch</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Your wallet is connected to <strong>{network}</strong>, but this app
           requires <strong>{NETWORK_PASSPHRASE}</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Please switch networks in your Freighter wallet settings.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
