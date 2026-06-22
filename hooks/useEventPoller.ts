"use client";

import { useEffect, useRef, useCallback } from "react";
import { EventPoller } from "@/lib/eventPoller";
import { useEventStore } from "@/lib/eventStore";
import type { PollingStatus } from "@/lib/eventPoller";

const DEFAULT_INTERVAL_MS = 15_000; // 15 seconds

export function useEventPoller(intervalMs = DEFAULT_INTERVAL_MS) {
  const pollerRef = useRef<EventPoller | null>(null);
  const existingIdsRef = useRef<Set<string>>(new Set());

  const { events, lastLedger, addEvents, setLastLedger, setPolling } =
    useEventStore();

  // Keep the dedup set in sync with the store
  useEffect(() => {
    existingIdsRef.current = new Set(events.map((e) => e.id));
  }, [events]);

  const handleStatusChange = useCallback(
    (status: PollingStatus) => {
      setPolling(status === "active");
    },
    [setPolling],
  );

  const start = useCallback(() => {
    if (!pollerRef.current) {
      pollerRef.current = new EventPoller();
    }

    pollerRef.current.start({
      intervalMs,
      startLedger: lastLedger,
      onEvents: addEvents,
      onLedgerUpdate: setLastLedger,
      onStatusChange: handleStatusChange,
      existingIds: existingIdsRef.current,
    });
  }, [intervalMs, lastLedger, addEvents, setLastLedger, handleStatusChange]);

  const stop = useCallback(() => {
    pollerRef.current?.stop();
    setPolling(false);
  }, [setPolling]);

  // Auto-start on mount, stop on unmount
  useEffect(() => {
    start();
    return () => {
      pollerRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { start, stop };
}
