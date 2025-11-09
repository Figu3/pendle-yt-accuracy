import type { PendleMarketsResponse, MarketHistoryResponse, PendleMarket } from '@/types/pendle';

const API_BASE = 'https://api-v2.pendle.finance/core';

export async function fetchAllMarkets(chainId: number = 1): Promise<PendleMarket[]> {
  const allMarkets: PendleMarket[] = [];
  let skip = 0;
  const limit = 100; // API max limit is 100
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `${API_BASE}/v1/${chainId}/markets?limit=${limit}&skip=${skip}`;
      console.log(`Fetching markets from: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`Failed to fetch markets: ${response.status} ${response.statusText}`);
      }

      const data: PendleMarketsResponse = await response.json();
      console.log(`Fetched ${data.results.length} markets (skip=${skip}, total=${data.total})`);

      allMarkets.push(...data.results);
      skip += limit;

      // Check if we've fetched all markets
      hasMore = skip < data.total;
    }

    console.log(`Total markets fetched: ${allMarkets.length}`);
    return allMarkets;
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
  marketAddress: string,
  retries: number = 3
): Promise<MarketHistoryResponse> {
  const url = `${API_BASE}/v2/${chainId}/markets/${marketAddress}/history`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (response.status === 429 && attempt < retries) {
        // Rate limited, wait and retry with exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited for ${marketAddress}, waiting ${waitTime}ms before retry ${attempt + 1}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error for ${marketAddress}:`, errorText);
        throw new Error(`Failed to fetch market history: ${response.status} ${response.statusText}`);
      }

      const data: MarketHistoryResponse = await response.json();
      return data;
    } catch (error) {
      if (attempt === retries) {
        console.error(`Error fetching history for ${marketAddress}:`, error);
        throw error;
      }
    }
  }

  throw new Error(`Failed to fetch market history after ${retries} retries`);
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
