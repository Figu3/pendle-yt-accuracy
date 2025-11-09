import { NextResponse } from 'next/server';
import { getExpiredMarkets } from '@/lib/pendleApi';
import { analyzeMarketAccuracyWithMetrics } from '@/lib/pendleAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '1');

    const expiredMarkets = await getExpiredMarkets(chainId);

    // Analyze markets with full metrics
    const results = [];
    const batchSize = 5;

    for (let i = 0; i < expiredMarkets.length; i += batchSize) {
      const batch = expiredMarkets.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(market => analyzeMarketAccuracyWithMetrics(market))
      );

      results.push(...batchResults.filter(r => r !== null));

      // Rate limiting
      if (i + batchSize < expiredMarkets.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Convert to CSV
    const csvRows: string[] = [];

    // Header
    csvRows.push([
      'chain_id',
      'market_address',
      'market_name',
      'protocol',
      'underlying_symbol',
      'maturity_timestamp',
      'maturity_date',
      'lead_days',
      't0_timestamp',
      't0_date',
      'implied_apy',
      'realized_apy',
      'pt_price',
      'error_signed',
      'error_abs',
      'error_rel_pct',
      'liquidity_usd',
      'trading_volume',
      'pendle_incentive_apy',
      'lp_reward_apy',
      'underlying_reward_apy',
      'total_tvl',
      'total_pt',
      'total_sy'
    ].join(','));

    // Data rows
    for (const market of results) {
      for (const lead of market.perLead) {
        if (lead.error !== null) {
          const maturityDate = new Date(market.maturity).toISOString();
          const t0Date = new Date(lead.timestamp).toISOString();

          const formatNumber = (val: any, decimals: number = 2): string => {
            if (val === null || val === undefined) return '';
            const num = typeof val === 'number' ? val : Number(val);
            return isNaN(num) ? '' : num.toFixed(decimals);
          };

          csvRows.push([
            market.chainId,
            market.marketAddress,
            `"${market.marketName.replace(/"/g, '""')}"`,
            `"${market.protocol.replace(/"/g, '""')}"`,
            `"${market.underlyingSymbol.replace(/"/g, '""')}"`,
            market.maturity,
            maturityDate,
            lead.leadDays,
            lead.timestamp,
            t0Date,
            formatNumber(lead.impliedApy, 6),
            formatNumber(lead.realizedApy, 6),
            formatNumber(lead.ptPrice, 6),
            formatNumber(lead.error, 6),
            formatNumber(lead.absError, 6),
            formatNumber(lead.relError, 6),
            formatNumber(lead.liquidityUsd, 2),
            formatNumber(lead.tradingVolume, 2),
            formatNumber(lead.pendleApy, 6),
            formatNumber(lead.lpRewardApy, 6),
            formatNumber(lead.underlyingRewardApy, 6),
            formatNumber(lead.totalTvl, 2),
            formatNumber(lead.totalPt, 2),
            formatNumber(lead.totalSy, 2)
          ].join(','));
        }
      }
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pendle-yt-accuracy-chain${chainId}.csv"`
      }
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export' },
      { status: 500 }
    );
  }
}
