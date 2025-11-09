import { NextResponse } from 'next/server';
import { analyzeDashboard } from '@/lib/pendleAnalytics';
import { getCached, setCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '1');
    const useCache = searchParams.get('cache') !== 'false';
    
    const cacheKey = `dashboard-${chainId}`;
    
    // Try to get from cache
    if (useCache) {
      const cached = await getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, cached: true });
      }
    }
    
    // Compute fresh data
    const summary = await analyzeDashboard(chainId);
    
    // Cache the result
    await setCache(cacheKey, summary);
    
    return NextResponse.json({ ...summary, cached: false });
  } catch (error) {
    console.error('Error in /api/pendle/markets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      {
        error: 'Failed to fetch market data',
        details: errorMessage,
        hint: 'Check server console for full error'
      },
      { status: 500 }
    );
  }
}
