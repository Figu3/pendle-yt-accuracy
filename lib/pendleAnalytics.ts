import type {
  PendleMarket,
  MarketHistoryResponse,
  LeadTimeData,
  MarketErrorSummary,
  DashboardSummary
} from '@/types/pendle';
import { fetchMarketHistory, getExpiredMarkets } from './pendleApi';

const LEAD_DAYS = [90, 60, 30, 14, 7, 3, 1];

/**
 * Calculate realized APY from PT price at t0
 * Formula: (1/P_t0 - 1) / (τ / 365)
 * where τ is days to maturity from t0
 */
function calculateRealizedApy(
  ptPriceAtT0: number,
  daysToMaturity: number
): number | null {
  if (ptPriceAtT0 <= 0 || daysToMaturity <= 0) return null;
  
  const tau = daysToMaturity / 365;
  const realizedApy = (1 / ptPriceAtT0 - 1) / tau;
  
  return realizedApy;
}

/**
 * Find the closest history point to a target timestamp
 */
function findClosestPoint(
  history: MarketHistoryResponse,
  targetTimestamp: number
): { point: any; index: number } | null {
  if (!history.results || history.results.length === 0) return null;
  
  let closestIndex = 0;
  let closestDiff = Math.abs(new Date(history.results[0].timestamp).getTime() - targetTimestamp);
  
  for (let i = 1; i < history.results.length; i++) {
    const pointTime = new Date(history.results[i].timestamp).getTime();
    const diff = Math.abs(pointTime - targetTimestamp);
    
    // Only consider points before or at the target (not future)
    if (pointTime <= targetTimestamp && diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  // If closest point is more than 2 days away, return null
  if (closestDiff > 2 * 24 * 60 * 60 * 1000) return null;
  
  return { point: history.results[closestIndex], index: closestIndex };
}

/**
 * Analyze a single market for YT pricing accuracy
 */
export async function analyzeMarketAccuracy(
  market: PendleMarket
): Promise<MarketErrorSummary | null> {
  try {
    const maturityTime = new Date(market.expiry).getTime();
    const now = Date.now();
    
    // Only analyze expired markets
    if (maturityTime >= now) return null;
    
    // Fetch full market history
    const history = await fetchMarketHistory(market.chainId, market.address);
    
    if (!history.results || history.results.length === 0) {
      return null;
    }
    
    const perLead: LeadTimeData[] = [];
    
    // Analyze each lead time horizon
    for (const leadDays of LEAD_DAYS) {
      const t0 = maturityTime - leadDays * 24 * 60 * 60 * 1000;
      
      // Skip if t0 is before market inception
      const marketStart = new Date(history.timestamp_start).getTime();
      if (t0 < marketStart) continue;
      
      // Find closest history point to t0
      const result = findClosestPoint(history, t0);
      if (!result) continue;
      
      const { point } = result;
      const impliedApy = point.impliedApy;
      const ptPrice = 1 - point.ptDiscount; // PT price from discount
      const daysToMaturity = leadDays;
      
      // Calculate realized APY
      const realizedApy = calculateRealizedApy(ptPrice, daysToMaturity);
      
      if (realizedApy !== null && impliedApy !== null) {
        const error = impliedApy - realizedApy;
        const absError = Math.abs(error);
        const relError = realizedApy !== 0 ? (error / Math.abs(realizedApy)) * 100 : null;
        
        perLead.push({
          leadDays,
          timestamp: t0,
          impliedApy,
          realizedApy,
          ptPrice,
          error,
          absError,
          relError
        });
      }
    }
    
    if (perLead.length === 0) return null;
    
    // Calculate overall statistics
    const validErrors = perLead.filter(p => p.error !== null);
    const meanAbsError = validErrors.length > 0
      ? validErrors.reduce((sum, p) => sum + (p.absError || 0), 0) / validErrors.length
      : null;
    
    const meanSignedError = validErrors.length > 0
      ? validErrors.reduce((sum, p) => sum + (p.error || 0), 0) / validErrors.length
      : null;
    
    const validRelErrors = perLead.filter(p => p.relError !== null);
    const meanRelAbsError = validRelErrors.length > 0
      ? validRelErrors.reduce((sum, p) => sum + Math.abs(p.relError || 0), 0) / validRelErrors.length
      : null;
    
    return {
      marketAddress: market.address,
      marketName: market.accountingAsset?.symbol || market.symbol,
      protocol: market.protocol,
      underlyingSymbol: market.underlyingAsset?.symbol || '',
      maturity: maturityTime,
      chainId: market.chainId,
      perLead,
      overall: {
        meanAbsError,
        meanSignedError,
        meanRelAbsError,
        dataPoints: perLead.length
      }
    };
  } catch (error) {
    console.error('Error analyzing market:', error);
    return null;
  }
}

/**
 * Analyze all expired markets
 */
export async function analyzeDashboard(chainId: number = 1): Promise<DashboardSummary> {
  const expiredMarkets = await getExpiredMarkets(chainId);
  
  const marketAnalyses: MarketErrorSummary[] = [];
  
  // Analyze markets in parallel (but limit concurrency to avoid rate limiting)
  const batchSize = 5;
  for (let i = 0; i < expiredMarkets.length; i += batchSize) {
    const batch = expiredMarkets.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(market => analyzeMarketAccuracy(market))
    );
    
    marketAnalyses.push(...results.filter((r): r is MarketErrorSummary => r !== null));
  }
  
  // Calculate overall statistics
  const allErrors = marketAnalyses.flatMap(m => m.perLead.filter(p => p.absError !== null));
  const overallMAE = allErrors.length > 0
    ? allErrors.reduce((sum, p) => sum + (p.absError || 0), 0) / allErrors.length
    : null;
  
  const overallMSE = allErrors.length > 0
    ? allErrors.reduce((sum, p) => sum + (p.error || 0), 0) / allErrors.length
    : null;
  
  return {
    totalExpiredMarkets: expiredMarkets.length,
    marketsWithData: marketAnalyses.length,
    overallMAE,
    overallMSE,
    markets: marketAnalyses
  };
}
