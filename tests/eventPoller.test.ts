import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventPoller, type EventPollerConfig } from "@/lib/eventPoller";

// Mock the stellar module to avoid real network calls
vi.mock("@/lib/stellar", () => ({
  getContractEvents: vi.fn(),
}));

import { getContractEvents } from "@/lib/stellar";

const mockGetEvents = vi.mocked(getContractEvents);

const makeConfig = (overrides: Partial<EventPollerConfig> = {}): EventPollerConfig => ({
  intervalMs: 100,
  startLedger: null,
  onEvents: vi.fn(),
  onLedgerUpdate: vi.fn(),
  onStatusChange: vi.fn(),
  existingIds: new Set<string>(),
  ...overrides,
});

/** Flush only the already-queued microtasks (one async tick), no repeated intervals. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("EventPoller", () => {
  let poller: EventPoller;

  beforeEach(() => {
    poller = new EventPoller();
    vi.useFakeTimers();
    mockGetEvents.mockResolvedValue([]);
  });

  afterEach(() => {
    poller.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls onStatusChange('active') on start", () => {
    const config = makeConfig();
    poller.start(config);
    expect(config.onStatusChange).toHaveBeenCalledWith("active");
  });

  it("polls immediately on start (calls getContractEvents once)", async () => {
    const config = makeConfig();
    poller.start(config);
    await flush();
    expect(mockGetEvents).toHaveBeenCalledTimes(1);
  });

  it("deduplicates events by id", async () => {
    const existingIds = new Set(["evt-1"]);
    const onEvents = vi.fn();
    const config = makeConfig({ existingIds, onEvents });

    mockGetEvents.mockResolvedValueOnce([
      { id: "evt-1", ledger: 1000, type: "create_market", data: {} },
      { id: "evt-2", ledger: 1001, type: "place_bet", data: {} },
    ] as never);

    poller.start(config);
    await flush();

    // onEvents should only be called with evt-2 (evt-1 already existed)
    expect(onEvents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "evt-2" })])
    );
    const calledWith = onEvents.mock.calls[0][0];
    expect(calledWith).not.toContainEqual(expect.objectContaining({ id: "evt-1" }));
  });

  it("adds new event IDs to existingIds after processing", async () => {
    const existingIds = new Set<string>();
    const config = makeConfig({ existingIds });

    mockGetEvents.mockResolvedValueOnce([
      { id: "evt-10", ledger: 999, type: "create_market", data: {} },
    ] as never);

    poller.start(config);
    await flush();

    expect(existingIds.has("evt-10")).toBe(true);
  });

  it("calls onLedgerUpdate with max ledger from new events", async () => {
    const onLedgerUpdate = vi.fn();
    const config = makeConfig({ onLedgerUpdate });

    mockGetEvents.mockResolvedValueOnce([
      { id: "a", ledger: 100, type: "create_market", data: {} },
      { id: "b", ledger: 200, type: "place_bet", data: {} },
      { id: "c", ledger: 150, type: "resolve_market", data: {} },
    ] as never);

    poller.start(config);
    await flush();

    expect(onLedgerUpdate).toHaveBeenCalledWith(200);
  });

  it("calls onStatusChange('error') when getContractEvents throws", async () => {
    const onStatusChange = vi.fn();
    const config = makeConfig({ onStatusChange });

    mockGetEvents.mockRejectedValueOnce(new Error("Network error"));

    poller.start(config);
    await flush();

    expect(onStatusChange).toHaveBeenCalledWith("error");
  });

  it("stop() prevents further polls when interval fires", async () => {
    const config = makeConfig({ intervalMs: 100 });
    poller.start(config);
    await flush();
    const callsBefore = mockGetEvents.mock.calls.length;

    poller.stop();
    // Advance clock manually — interval should NOT fire
    vi.advanceTimersByTime(500);
    await flush();

    expect(mockGetEvents.mock.calls.length).toBe(callsBefore);
  });

  it("calling start() a second time polls exactly once more (restarted)", async () => {
    const config = makeConfig({ intervalMs: 100 });
    mockGetEvents.mockResolvedValue([]);

    poller.start(config);
    await flush();
    const after1 = mockGetEvents.mock.calls.length; // 1

    poller.start(config);
    await flush();
    const after2 = mockGetEvents.mock.calls.length; // 2

    expect(after2).toBe(after1 + 1);
  });
});
