export interface MarketData {
  id: number;
  question: string;
  description: string;
  creator: string;
  expiration_date: number;
  total_yes_shares: string;
  total_no_shares: string;
  resolved: boolean;
  outcome: boolean;
  token: string;
  participants: number;
}

export interface UserPositionData {
  yes_shares: string;
  no_shares: string;
  claimed: boolean;
}

export interface TransactionRecord {
  id: string;
  hash: string;
  type: "create_market" | "place_bet" | "resolve_market" | "claim_reward";
  status: "pending" | "success" | "failed";
  timestamp: number;
  description: string;
  explorerLink: string;
  error?: string;
}

export interface ContractEvent {
  id: string;
  type: "MarketCreated" | "BetPlaced" | "MarketResolved" | "RewardClaimed";
  ledger: number;
  timestamp: number;
  data: Record<string, any>;
}

export interface CreateMarketParams {
  question: string;
  description: string;
  expirationDate: number;
  token: string;
}

export interface PlaceBetParams {
  marketId: number;
  isYes: boolean;
  amount: string;
}

export interface AnalyticsData {
  totalMarkets: number;
  totalPredictions: number;
  totalVolumeXLM: number;
  mostActiveMarket: { id: number; question: string; totalBets: number } | null;
}

export interface UserPrediction {
  marketId: number;
  question: string;
  isYes: boolean;
  amount: string;
  timestamp: number;
  resolved: boolean;
  won: boolean | null;
  claimed: boolean;
}
