import { getContractEvents } from "./stellar";
import type { ContractEvent } from "@/types";

export type PollingStatus = "idle" | "active" | "error";

export interface EventPollerConfig {
  intervalMs: number;
  startLedger: number | null;
  onEvents: (events: ContractEvent[]) => void;
  onLedgerUpdate: (ledger: number) => void;
  onStatusChange: (status: PollingStatus) => void;
  existingIds: Set<string>;
}

export class EventPoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  start(config: EventPollerConfig) {
    this.stop();
    config.onStatusChange("active");

    this.intervalId = setInterval(() => {
      this.poll(config);
    }, config.intervalMs);

    // Also poll immediately on start
    this.poll(config);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll(config: EventPollerConfig) {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const events = await getContractEvents(
        config.startLedger ?? undefined
      );

      if (!events || !Array.isArray(events) || events.length === 0) {
        config.onStatusChange("active");
        this.isPolling = false;
        return;
      }

      // Deduplicate via the existingIds set
      const newEvents = events.filter(
        (e: ContractEvent) => !config.existingIds.has(e.id)
      );

      if (newEvents.length > 0) {
        config.onEvents(newEvents);

        // Update highest ledger
        const maxLedger = Math.max(...newEvents.map((e: ContractEvent) => e.ledger));
        config.onLedgerUpdate(maxLedger);

        // Add new IDs to the set for future deduplication
        newEvents.forEach((e: ContractEvent) => config.existingIds.add(e.id));
      }

      config.onStatusChange("active");
    } catch {
      config.onStatusChange("error");
      // Swallow exception so next setInterval tick retries
    } finally {
      this.isPolling = false;
    }
  }
}
