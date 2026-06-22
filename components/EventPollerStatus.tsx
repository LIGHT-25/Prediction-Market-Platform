"use client";

import { Activity } from "lucide-react";
import { useEventStore } from "@/lib/eventStore";

export function EventPollerStatus() {
  const isPolling = useEventStore((s) => s.isPolling);
  const eventCount = useEventStore((s) => s.events.length);
  const lastLedger = useEventStore((s) => s.lastLedger);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground">
      <span
        className={`relative flex h-2 w-2 ${isPolling ? "" : "opacity-50"}`}
      >
        {isPolling && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isPolling ? "bg-emerald-500" : "bg-muted-foreground"
          }`}
        />
      </span>
      <Activity className="w-3 h-3" />
      <span>
        {isPolling ? "Live" : "Paused"}
        {eventCount > 0 && ` · ${eventCount} events`}
        {lastLedger && ` · L${lastLedger}`}
      </span>
    </div>
  );
}
