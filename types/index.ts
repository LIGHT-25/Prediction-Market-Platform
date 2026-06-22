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
  oracle_id?: string;
  oracle_asset?: string;
  resolution_price_threshold?: string;
}

export interface UserPositionData {
  yes_shares: string;
  no_shares: string;
  claimed: boolean;
}

export interface TransactionRecord {
  id: string;
  hash: string;
  type: "create_market" | "place_bet" | "resolve_market" | "claim_reward" | "create_market_with_oracle" | "auto_resolve_market";
  status: "pending" | "success" | "failed";
  timestamp: number;
  description: string;
  explorerLink: string;
  error?: string;
}

export interface ContractEvent {
  id: string;
  type: "MarketCreated" | "BetPlaced" | "MarketResolved" | "RewardClaimed" | "MarketAutoResolved";
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

export interface CreateMarketWithOracleParams extends CreateMarketParams {
  oracleContractId: string;
  oracleAsset: string;
  resolutionPriceThreshold: string;
}

export interface PlaceBetParams {
  marketId: number;
  isYes: boolean;
  amount: string;
}

export interface WalletState {
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

