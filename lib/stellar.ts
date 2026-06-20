import {
  invokeContract,
  readContract,
  nativeToScVal,
  Address,
  xdr,
  fetchContractEvents,
} from "./contract";
import { NATIVE_TOKEN_ADDRESS } from "./config";
import type {
  MarketData,
  UserPositionData,
  CreateMarketParams,
  PlaceBetParams,
  AnalyticsData,
  UserPrediction,
} from "@/types";

export async function createMarket(
  callerAddress: string,
  params: CreateMarketParams
): Promise<{ marketId: number; txHash: string }> {
  const args: xdr.ScVal[] = [
    new Address(callerAddress).toScVal(),
    nativeToScVal(params.question, { type: "string" }),
    nativeToScVal(params.description, { type: "string" }),
    nativeToScVal(params.expirationDate, { type: "u64" }),
    new Address(params.token || NATIVE_TOKEN_ADDRESS).toScVal(),
  ];

  const { result, txHash } = await invokeContract(
    "create_market",
    args,
    callerAddress
  );

  return { marketId: result as number, txHash };
}

export async function placeBet(
  callerAddress: string,
  params: PlaceBetParams
): Promise<{ txHash: string }> {
  const amountStroops = BigInt(
    Math.floor(parseFloat(params.amount) * 10_000_000)
  );

  if (amountStroops <= 0n) {
    throw new Error("Invalid prediction amount: must be greater than 0");
  }

  const args: xdr.ScVal[] = [
    nativeToScVal(params.marketId, { type: "u32" }),
    new Address(callerAddress).toScVal(),
    nativeToScVal(params.isYes),
    nativeToScVal(amountStroops, { type: "i128" }),
  ];

  const { txHash } = await invokeContract("place_bet", args, callerAddress);
  return { txHash };
}

export async function getMarket(
  marketId: number,
  callerAddress?: string
): Promise<MarketData | null> {
  const args: xdr.ScVal[] = [nativeToScVal(marketId, { type: "u32" })];

  const result = await readContract("get_market", args, callerAddress);
  if (!result) return null;

  return normalizeMarket(result);
}

export async function getAllMarkets(
  callerAddress?: string
): Promise<MarketData[]> {
  const result = await readContract("get_all_markets", [], callerAddress);
  if (!result || !Array.isArray(result)) return [];

  return result.map(normalizeMarket);
}

export async function resolveMarket(
  callerAddress: string,
  marketId: number,
  outcome: boolean
): Promise<{ txHash: string }> {
  const args: xdr.ScVal[] = [
    nativeToScVal(marketId, { type: "u32" }),
    nativeToScVal(outcome),
  ];

  const { txHash } = await invokeContract(
    "resolve_market",
    args,
    callerAddress
  );
  return { txHash };
}

export async function claimReward(
  callerAddress: string,
  marketId: number
): Promise<{ txHash: string }> {
  const args: xdr.ScVal[] = [
    nativeToScVal(marketId, { type: "u32" }),
    new Address(callerAddress).toScVal(),
  ];

  const { txHash } = await invokeContract("claim_reward", args, callerAddress);
  return { txHash };
}

export async function getUserPosition(
  marketId: number,
  userAddress: string
): Promise<UserPositionData> {
  const args: xdr.ScVal[] = [
    nativeToScVal(marketId, { type: "u32" }),
    new Address(userAddress).toScVal(),
  ];

  const result = await readContract("get_user_position", args, userAddress);

  if (!result) {
    return { yes_shares: "0", no_shares: "0", claimed: false };
  }

  return {
    yes_shares: String(result.yes_shares ?? "0"),
    no_shares: String(result.no_shares ?? "0"),
    claimed: Boolean(result.claimed),
  };
}

export async function getContractEvents(startLedger?: number) {
  return fetchContractEvents(startLedger);
}

export async function getAnalytics(callerAddress?: string): Promise<AnalyticsData> {
  const markets = await getAllMarkets(callerAddress);
  let totalPredictions = 0;
  let totalVolumeStroops = 0;
  let mostActiveMarket: { id: number; question: string; totalBets: number } | null = null;

  for (const m of markets) {
    const yesShares = Number(m.total_yes_shares);
    const noShares = Number(m.total_no_shares);
    const marketBets = (yesShares > 0 ? 1 : 0) + (noShares > 0 ? 1 : 0);

    totalPredictions += marketBets;
    totalVolumeStroops += yesShares + noShares;

    if (!mostActiveMarket || marketBets > mostActiveMarket.totalBets) {
      mostActiveMarket = { id: m.id, question: m.question, totalBets: marketBets };
    }
  }

  return {
    totalMarkets: markets.length,
    totalPredictions,
    totalVolumeXLM: totalVolumeStroops / 10_000_000,
    mostActiveMarket:
      mostActiveMarket && mostActiveMarket.totalBets > 0 ? mostActiveMarket : null,
  };
}

export async function getUserPredictionHistory(
  address: string
): Promise<UserPrediction[]> {
  const markets = await getAllMarkets(address);
  const predictions: UserPrediction[] = [];

  for (const market of markets) {
    const pos = await getUserPosition(market.id, address);
    const yesAmt = Number(pos.yes_shares);
    const noAmt = Number(pos.no_shares);

    if (yesAmt > 0) {
      predictions.push({
        marketId: market.id,
        question: market.question,
        isYes: true,
        amount: (yesAmt / 10_000_000).toFixed(2),
        timestamp: Date.now(),
        resolved: market.resolved,
        won: market.resolved ? market.outcome === true : null,
        claimed: pos.claimed,
      });
    }
    if (noAmt > 0) {
      predictions.push({
        marketId: market.id,
        question: market.question,
        isYes: false,
        amount: (noAmt / 10_000_000).toFixed(2),
        timestamp: Date.now(),
        resolved: market.resolved,
        won: market.resolved ? market.outcome === false : null,
        claimed: pos.claimed,
      });
    }
  }

  return predictions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeMarket(raw: any): MarketData {
  return {
    id: Number(raw.id),
    question: String(raw.question ?? ""),
    description: String(raw.description ?? ""),
    creator: String(raw.creator ?? ""),
    expiration_date: Number(raw.expiration_date ?? 0),
    total_yes_shares: String(raw.total_yes_shares ?? "0"),
    total_no_shares: String(raw.total_no_shares ?? "0"),
    resolved: Boolean(raw.resolved),
    outcome: Boolean(raw.outcome),
    token: String(raw.token ?? ""),
    participants: Number(raw.participants ?? 0),
  };
}
