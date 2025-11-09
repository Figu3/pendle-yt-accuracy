// Pendle Market types
export interface PendleAsset {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  price: { usd: number };
  name: string;
  proIcon?: string;
  expiry?: string | null;
}

export interface PendleMarket {
  id: string;
  chainId: number;
  address: string;
  symbol: string;
  expiry: string;
  pt: PendleAsset;
  yt: PendleAsset;
  sy: PendleAsset;
  lp: PendleAsset;
  accountingAsset: PendleAsset;
  underlyingAsset: PendleAsset;
  protocol: string;
  isActive: boolean;
  liquidity: { usd: number; acc: number };
  underlyingApy: number;
  impliedApy: number;
}

export interface PendleMarketsResponse {
  total: number;
  limit: number;
  skip: number;
  results: PendleMarket[];
}

// Market History types
export interface MarketHistoryPoint {
  timestamp: string;
  liquidity: { usd: number; acc: number };
  underlyingApy: number;
  impliedApy: number;
  ptDiscount: number;
  tradingVolume?: number;
  pendleApy?: number;
  lpRewardApy?: number;
  underlyingRewardApy?: number;
  totalTvl?: number;
  totalPt?: number;
  totalSy?: number;
}

export interface MarketHistoryResponse {
  total: number;
  limit: number;
  timestamp_start: string;
  timestamp_end: string;
  results: MarketHistoryPoint[];
}

// Analysis types
export interface LeadTimeData {
  leadDays: number;
  timestamp: number; // t0 = maturity - leadDays
  impliedApy: number | null;
  realizedApy: number | null;
  ptPrice: number | null;
  error: number | null; // signed error
  absError: number | null;
  relError: number | null; // relative error as percentage
  liquidityUsd?: number | null;
  tradingVolume?: number | null;
  pendleApy?: number | null;
  lpRewardApy?: number | null;
  underlyingRewardApy?: number | null;
  totalTvl?: number | null;
  totalPt?: number | null;
  totalSy?: number | null;
}

export interface MarketErrorSummary {
  marketAddress: string;
  marketName: string;
  protocol: string;
  underlyingSymbol: string;
  maturity: number;
  chainId: number;
  perLead: LeadTimeData[];
  overall: {
    meanAbsError: number | null;
    meanSignedError: number | null;
    meanRelAbsError: number | null;
    dataPoints: number;
  };
}

export interface DashboardSummary {
  totalExpiredMarkets: number;
  marketsWithData: number;
  overallMAE: number | null;
  overallMSE: number | null;
  markets: MarketErrorSummary[];
}
