"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useEventStore } from "@/lib/eventStore";
import { getContractEvents } from "@/lib/stellar";
import { EXPLORER_URL } from "@/lib/config";
import type { ContractEvent } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEvent(raw: any): ContractEvent | null {
  try {
    if (!raw.value) return null;
    const topic0 = raw.topic?.[0]?.toString() || "";
    const type = topic0.replace("Symbol(", "").replace(")", "") as ContractEvent["type"];
    if (!["MarketCreated", "BetPlaced", "MarketResolved", "RewardClaimed"].includes(type)) {
      return null;
    }
    return {
      id: `${raw.ledger}-${raw.id}`,
      type,
      ledger: raw.ledger,
      timestamp: Date.now(),
      data: raw.value,
    };
  } catch {
    return null;
  }
}

export default function ActivityPage() {
  const { events, addEvents, lastLedger, setLastLedger } = useEventStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const rawEvents = await getContractEvents(lastLedger || undefined);
      const parsed: ContractEvent[] = [];
      for (const raw of rawEvents) {
        const e = parseEvent(raw);
        if (e) parsed.push(e);
      }
      if (parsed.length > 0) {
        addEvents(parsed);
        const maxLedger = Math.max(...parsed.map((e) => e.ledger));
        setLastLedger(maxLedger);
      }
    } catch {
      // Silently fail on poll
    }
  }, [lastLedger, addEvents, setLastLedger]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchEvents, 10_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "MarketCreated":
        return { bg: "bg-sky-500/10", color: "text-sky-400", label: "Market Created" };
      case "BetPlaced":
        return { bg: "bg-violet-500/10", color: "text-violet-400", label: "Bet Placed" };
      case "MarketResolved":
        return { bg: "bg-emerald-500/10", color: "text-emerald-400", label: "Market Resolved" };
      case "RewardClaimed":
        return { bg: "bg-amber-500/10", color: "text-amber-400", label: "Reward Claimed" };
      default:
        return { bg: "bg-muted", color: "text-muted-foreground", label: type };
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-sm text-muted-foreground">
            Real-time contract events stream
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No events yet. Create a market or place a bet to see activity here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const style = getEventIcon(event.type);
            return (
              <div
                key={event.id}
                className="rounded-xl border border-border/50 bg-card p-4 card-hover"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${style.bg} shrink-0`}>
                    <Activity className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Ledger #{event.ledger}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      {event.type === "MarketCreated" && (
                        <>
                          Market <span className="font-mono text-primary">#{event.data?.[0]}</span> created
                          by <span className="font-mono">{String(event.data?.[1]).slice(0, 6)}...</span>
                        </>
                      )}
                      {event.type === "BetPlaced" && (
                        <>
                          Bet placed on Market <span className="font-mono text-primary">#{event.data?.[0]}</span> by{" "}
                          <span className="font-mono">{String(event.data?.[1]).slice(0, 6)}...</span>
                        </>
                      )}
                      {event.type === "MarketResolved" && (
                        <>
                          Market <span className="font-mono text-primary">#{event.data?.[0]}</span> resolved
                        </>
                      )}
                      {event.type === "RewardClaimed" && (
                        <>
                          Reward claimed on Market <span className="font-mono text-primary">#{event.data?.[0]}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={`${EXPLORER_URL}/ledger/${event.ledger}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
