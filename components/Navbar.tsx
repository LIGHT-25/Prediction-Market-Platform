"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Wallet,
  Activity,
  History,
  Sun,
  Moon,
  Menu,
  X,
  List,
} from "lucide-react";
import { useWalletStore } from "@/lib/walletStore";
import { useTransactionStore } from "@/lib/transactionStore";
import { useToast } from "@/components/Toast";
import { TxModal } from "@/components/TxModal";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/dashboard", label: "Dashboard", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/transactions", label: "Transactions", icon: History },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, isLoading, connect, disconnect } =
    useWalletStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [txModalOpen, setTxModalOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      toast("Wallet connected successfully!", "success");
    } catch (error: unknown) {
      toast((error as Error)?.message || "Failed to connect wallet", "error");
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast("Wallet disconnected", "info");
  };

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:block">
              StellarPredict
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                  <span className="status-dot status-dot-success" />
                  <span className="font-mono text-xs">
                    {truncatedAddress}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Opening Freighter..." : "Connect Freighter"}
              </button>
            )}

            {/* Tx Status Button */}
            {transactions.length > 0 && (
              <button
                onClick={() => setTxModalOpen(true)}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Transaction Status"
              >
                <List className="w-4 h-4" />
                {transactions.some((t) => t.status === "pending") && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-border/50 pt-3 mt-1">
            <div className="flex flex-col gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Transaction Status Modal */}
      <TxModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        transactions={transactions}
      />
    </header>
  );
}
