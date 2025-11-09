import { NextResponse } from 'next/server';
import { getMarketById } from '@/lib/pendleApi';
import { analyzeMarketAccuracy } from '@/lib/pendleAnalytics';
import { getCached, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ market: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '1');
    const { market: marketAddress } = await params;
    const useCache = searchParams.get('cache') !== 'false';
    
    const cacheKey = `market-${chainId}-${marketAddress}`;
    
    // Try to get from cache
    if (useCache) {
      const cached = await getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    }
    
    // Fetch market details
    const market = await getMarketById(chainId, marketAddress);
    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }
    
    // Analyze market
    const analysis = await analyzeMarketAccuracy(market);
    if (!analysis) {
      return NextResponse.json(
        { error: 'Unable to analyze market (no historical data or not expired)' },
        { status: 404 }
      );
    }
    
    // Cache the result
    await setCache(cacheKey, analysis);
    
    return NextResponse.json({ ...analysis, cached: false });
  } catch (error) {
    console.error('Error in /api/pendle/markets/[market]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
