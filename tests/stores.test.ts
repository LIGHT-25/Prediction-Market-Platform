import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useEventStore } from "@/lib/eventStore";
import type { ContractEvent } from "@/types";

const mockEvent = (id: string, ledger = 1000): ContractEvent => ({
  id,
  ledger,
  type: "create_market",
  data: { marketId: 1 },
});

describe("useEventStore", () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useEventStore.getState().clearEvents();
    });
  });

  it("initialises with empty events and null lastLedger", () => {
    const state = useEventStore.getState();
    expect(state.events).toHaveLength(0);
    expect(state.lastLedger).toBeNull();
    expect(state.isPolling).toBe(false);
  });

  it("setEvents replaces the events array", () => {
    const events = [mockEvent("a"), mockEvent("b")];
    act(() => useEventStore.getState().setEvents(events));
    expect(useEventStore.getState().events).toEqual(events);
  });

  it("addEvents appends unique events only", () => {
    act(() => useEventStore.getState().addEvents([mockEvent("a")]));
    act(() => useEventStore.getState().addEvents([mockEvent("a"), mockEvent("b")]));
    const { events } = useEventStore.getState();
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("addEvents places newest events at the front", () => {
    act(() => useEventStore.getState().addEvents([mockEvent("old", 100)]));
    act(() => useEventStore.getState().addEvents([mockEvent("new", 200)]));
    expect(useEventStore.getState().events[0].id).toBe("new");
  });

  it("addEvents caps store at 200 events", () => {
    const big = Array.from({ length: 210 }, (_, i) => mockEvent(`e-${i}`));
    act(() => useEventStore.getState().addEvents(big));
    expect(useEventStore.getState().events).toHaveLength(200);
  });

  it("setLastLedger updates the ledger", () => {
    act(() => useEventStore.getState().setLastLedger(9999));
    expect(useEventStore.getState().lastLedger).toBe(9999);
  });

  it("setPolling toggles the isPolling flag", () => {
    act(() => useEventStore.getState().setPolling(true));
    expect(useEventStore.getState().isPolling).toBe(true);
    act(() => useEventStore.getState().setPolling(false));
    expect(useEventStore.getState().isPolling).toBe(false);
  });

  it("clearEvents resets events and lastLedger", () => {
    act(() => {
      useEventStore.getState().addEvents([mockEvent("x")]);
      useEventStore.getState().setLastLedger(500);
    });
    act(() => useEventStore.getState().clearEvents());
    const state = useEventStore.getState();
    expect(state.events).toHaveLength(0);
    expect(state.lastLedger).toBeNull();
  });
});
