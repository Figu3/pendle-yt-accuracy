import type { PendleMarketsResponse, MarketHistoryResponse, PendleMarket } from '@/types/pendle';

const API_BASE = 'https://api-v2.pendle.finance/core';

export async function fetchAllMarkets(chainId: number = 1): Promise<PendleMarket[]> {
  const url = `${API_BASE}/v1/${chainId}/markets?limit=1000`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }
    
    const data: PendleMarketsResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw error;
  }
}

export async function getExpiredMarkets(chainId: number = 1): Promise<PendleMarket[]> {
  const markets = await fetchAllMarkets(chainId);
  const now = Date.now();
  
  return markets.filter(market => {
    const expiryTime = new Date(market.expiry).getTime();
    return expiryTime < now;
  });
}

export async function fetchMarketHistory(
  chainId: number,
  marketAddress: string
): Promise<MarketHistoryResponse> {
  const url = `${API_BASE}/v2/${chainId}/markets/${marketAddress}/history`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 43200 } // Cache for 12 hours
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market history: ${response.statusText}`);
    }
    
    const data: MarketHistoryResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching history for ${marketAddress}:`, error);
    throw error;
  }
}

export async function getMarketById(
  chainId: number,
  marketAddress: string
): Promise<PendleMarket | null> {
  try {
    const markets = await fetchAllMarkets(chainId);
    return markets.find(m => m.address.toLowerCase() === marketAddress.toLowerCase()) || null;
  } catch (error) {
    console.error(`Error fetching market ${marketAddress}:`, error);
    return null;
  }
}
