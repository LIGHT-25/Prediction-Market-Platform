import { create } from "zustand";
import {
  connectWallet,
  disconnectWallet,
  getConnectedAddress,
  getNetwork,
  FreighterError,
} from "./wallet";
import { NETWORK_PASSPHRASE } from "./config";
import { Horizon } from "@stellar/stellar-sdk";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  network: string | null;
  balance: string;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  network: null,
  balance: "0",
  isLoading: false,
  error: null,

  connect: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await connectWallet();
      set({ address: result.address, isConnected: true });

      try {
        const phrase = await getNetwork();
        set({ network: phrase });
      } catch {
        set({ network: NETWORK_PASSPHRASE });
      }

      await get().fetchBalance();
      set({ isLoading: false });
    } catch (error: unknown) {
      let message = (error as Error)?.message || "Failed to connect wallet";
      if (error instanceof FreighterError) {
        message = error.message;
      }
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  disconnect: async () => {
    set({ isLoading: true });
    try {
      await disconnectWallet();
    } catch {
      // Ignore disconnect errors
    }
    set({
      address: null,
      isConnected: false,
      network: null,
      balance: "0",
      isLoading: false,
      error: null,
    });
  },

  fetchBalance: async () => {
    const { address } = get();
    if (!address) return;

    try {
      const server = new Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find(
        (b: { asset_type: string }) => b.asset_type === "native"
      )?.balance;
      set({ balance: nativeBalance || "0" });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) {
        set({ balance: "0 (Unfunded)" });
      } else {
        console.error("Error fetching balance:", err);
      }
    }
  },

  checkConnection: async () => {
    try {
      const address = await getConnectedAddress();
      if (address) {
        set({ address, isConnected: true });
        try {
          const phrase = await getNetwork();
          set({ network: phrase });
        } catch {
          set({ network: NETWORK_PASSPHRASE });
        }
        await get().fetchBalance();
      }
    } catch (err) {
      console.error("Check connection failed:", err);
    }
  },
}));
