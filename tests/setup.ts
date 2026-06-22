import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    pathname: "/",
    query: {},
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
  usePathname: vi.fn().mockReturnValue("/"),
}));

// Mock Freighter wallet APIs
vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  getPublicKey: vi.fn().mockResolvedValue({ publicKey: "" }),
  signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "" }),
  getNetworkDetails: vi.fn().mockResolvedValue({
    networkPassphrase: "Test SDF Network ; September 2015",
    network: "TESTNET",
  }),
}));

// Silence console.error in test output for known expected errors
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("Warning:")) return;
  originalConsoleError(...args);
};
