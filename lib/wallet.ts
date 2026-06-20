import {
  isConnected as freighterIsConnected,
  isAllowed as freighterIsAllowed,
  requestAccess as freighterRequestAccess,
  getAddress as freighterGetAddress,
  getNetwork as freighterGetNetwork,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./config";

export class FreighterError extends Error {
  code: string;
  constructor(message: string, code = "WALLET_ERROR") {
    super(message);
    this.name = "FreighterError";
    this.code = code;
  }
}

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new FreighterError("Cannot connect on server side");
  }
}

export async function checkFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isConnected: freighterAvailable } = await freighterIsConnected();
    return !!freighterAvailable;
  } catch {
    return false;
  }
}

export async function connectWallet(): Promise<{ address: string }> {
  assertBrowser();

  try {
    const { isConnected: freighterAvailable } = await freighterIsConnected();
    if (!freighterAvailable) {
      throw new FreighterError(
        "Freighter wallet not installed. Please install the Freighter browser extension.",
        "WALLET_NOT_FOUND"
      );
    }

    const { address, error } = await freighterRequestAccess();
    if (error) {
      throw mapFreighterApiError(error);
    }
    if (!address) {
      throw new FreighterError("No address returned from Freighter", "NO_ADDRESS");
    }
    return { address };
  } catch (error: unknown) {
    if (error instanceof FreighterError) throw error;
    throw mapFreighterError(error, "CONNECT_FAILED");
  }
}

export async function disconnectWallet(): Promise<void> {
  // Freighter has no programmatic disconnect
}

export async function getConnectedAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { isConnected: freighterAvailable } = await freighterIsConnected();
    if (!freighterAvailable) return null;

    const { isAllowed } = await freighterIsAllowed();
    if (!isAllowed) return null;

    const { address, error } = await freighterGetAddress();
    if (error || !address) return null;
    return address;
  } catch {
    return null;
  }
}

export async function getNetwork(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const result = await freighterGetNetwork();
    return result.networkPassphrase || null;
  } catch {
    return null;
  }
}

export async function signTx(xdr: string, userAddress: string): Promise<string> {
  assertBrowser();

  try {
    const { signedTxXdr } = await freighterSignTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: userAddress,
    });
    return signedTxXdr;
  } catch (error: unknown) {
    if (error instanceof FreighterError) throw error;
    throw mapFreighterError(error, "SIGN_FAILED");
  }
}

function mapFreighterApiError(error: { code?: number; message: string }): FreighterError {
  const msg = error.message || "Freighter request failed";
  if (msg.includes("reject") || msg.includes("denied") || msg.includes("cancel")) {
    return new FreighterError("Request rejected by user", "USER_REJECTED");
  }
  return new FreighterError(msg, String(error.code || "FREIGHTER_ERROR"));
}

function mapFreighterError(error: unknown, fallbackCode: string): FreighterError {
  const msg = (error as Error)?.message || String(error);

  if (msg.includes("install") || msg.includes("Freighter") || msg.includes("Module")) {
    return new FreighterError(
      "Freighter wallet not installed. Please install the Freighter browser extension.",
      "WALLET_NOT_FOUND"
    );
  }
  if (msg.includes("reject") || msg.includes("denied") || msg.includes("cancel")) {
    return new FreighterError("Request rejected by user", "USER_REJECTED");
  }

  return new FreighterError(msg, fallbackCode);
}
