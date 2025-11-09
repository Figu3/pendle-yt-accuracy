'use client';

import { useState, useEffect } from 'react';
import type { DashboardSummary, MarketErrorSummary } from '@/types/pendle';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHAINS = [
  { id: 1, name: 'Ethereum' },
  { id: 42161, name: 'Arbitrum' },
  { id: 56, name: 'BSC' },
  { id: 8453, name: 'Base' },
  { id: 146, name: 'Sonic' },
  { id: 9745, name: 'Plasma' },
];

export default function Home() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketErrorSummary | null>(null);
  const [minDataPoints, setMinDataPoints] = useState(3);
  const [selectedChain, setSelectedChain] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/pendle/markets?chainId=${selectedChain}`);
        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedChain]);

  const filteredMarkets = data?.markets.filter(m => {
    if (m.overall.dataPoints < minDataPoints) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      m.marketName.toLowerCase().includes(query) ||
      m.protocol.toLowerCase().includes(query) ||
      m.underlyingSymbol.toLowerCase().includes(query)
    );
  }) || [];

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (a.overall.meanAbsError === null) return 1;
    if (b.overall.meanAbsError === null) return -1;
    return b.overall.meanAbsError - a.overall.meanAbsError;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading market data...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a minute...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Pendle YT Pricing Accuracy</h1>
          <p className="text-gray-400">
            Historical analysis of implied APY accuracy vs realized yields for expired Pendle markets
          </p>
        </header>

        {/* Chain Selector */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-400">Select Chain:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChain === chain.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-blue-400">
                {CHAINS.find(c => c.id === selectedChain)?.name} Analysis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Total Expired Markets</div>
                <div className="text-3xl font-bold">{data.totalExpiredMarkets}</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Markets with Data</div>
                <div className="text-3xl font-bold">{data.marketsWithData}</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Overall MAE</div>
                <div className="text-3xl font-bold">
                  {data.overallMAE !== null ? (data.overallMAE * 100).toFixed(2) + '%' : 'N/A'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Mean Absolute Error</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="text-sm text-gray-400 mb-1">Overall Bias</div>
                <div className={`text-3xl font-bold ${data.overallMSE && data.overallMSE > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {data.overallMSE !== null ? (data.overallMSE * 100).toFixed(2) + '%' : 'N/A'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Mean Signed Error</div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search markets by name, protocol, or underlying..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">Min Data Points:</label>
                  <select
                    value={minDataPoints}
                    onChange={(e) => setMinDataPoints(parseInt(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1+</option>
                    <option value={3}>3+</option>
                    <option value={5}>5+</option>
                    <option value={7}>All (7)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Market</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Protocol</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Maturity</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">MAE</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Bias</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Data Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMarkets.map((market) => (
                      <tr
                        key={market.marketAddress}
                        onClick={() => setSelectedMarket(market)}
                        className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-medium">{market.marketName}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">{market.protocol}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(market.maturity).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {market.overall.meanAbsError !== null
                            ? (market.overall.meanAbsError * 100).toFixed(2) + '%'
                            : 'N/A'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono ${
                          market.overall.meanSignedError && market.overall.meanSignedError > 0
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}>
                          {market.overall.meanSignedError !== null
                            ? (market.overall.meanSignedError > 0 ? '+' : '') +
                              (market.overall.meanSignedError * 100).toFixed(2) + '%'
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">
                          {market.overall.dataPoints}/7
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedMarket && (
              <MarketDetail
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function MarketDetail({
  market,
  onClose,
}: {
  market: MarketErrorSummary;
  onClose: () => void;
}) {
  const chartData = market.perLead.map(p => ({
    leadDays: p.leadDays,
    impliedApy: p.impliedApy ? p.impliedApy * 100 : null,
    realizedApy: p.realizedApy ? p.realizedApy * 100 : null,
    error: p.error ? p.error * 100 : null,
  }));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1">{market.marketName}</h2>
            <p className="text-gray-400 text-sm">
              {market.protocol} • Matured {new Date(market.maturity).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Mean Absolute Error</div>
              <div className="text-2xl font-bold">
                {market.overall.meanAbsError !== null
                  ? (market.overall.meanAbsError * 100).toFixed(2) + '%'
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Mean Signed Error</div>
              <div className={`text-2xl font-bold ${
                market.overall.meanSignedError && market.overall.meanSignedError > 0
                  ? 'text-red-400'
                  : 'text-green-400'
              }`}>
                {market.overall.meanSignedError !== null
                  ? (market.overall.meanSignedError > 0 ? '+' : '') +
                    (market.overall.meanSignedError * 100).toFixed(2) + '%'
                  : 'N/A'}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Data Points</div>
              <div className="text-2xl font-bold">{market.overall.dataPoints}/7</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Implied vs Realized APY by Lead Time</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="leadDays"
                    stroke="#9CA3AF"
                    label={{ value: 'Days Before Maturity', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    label={{ value: 'APY (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="impliedApy"
                    stroke="#3B82F6"
                    name="Implied APY"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="realizedApy"
                    stroke="#10B981"
                    name="Realized APY"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Prediction Error by Lead Time</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="leadDays"
                    stroke="#9CA3AF"
                    label={{ value: 'Days Before Maturity', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    label={{ value: 'Error (percentage points)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="error"
                    stroke="#EF4444"
                    name="Signed Error"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400 font-semibold">Lead Days</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Implied APY</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Realized APY</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">Error</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-semibold">PT Price</th>
                  </tr>
                </thead>
                <tbody>
                  {market.perLead.map((point) => (
                    <tr key={point.leadDays} className="border-b border-gray-800">
                      <td className="py-2 px-3">{point.leadDays}d</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {point.impliedApy !== null ? (point.impliedApy * 100).toFixed(2) + '%' : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {point.realizedApy !== null ? (point.realizedApy * 100).toFixed(2) + '%' : 'N/A'}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${
                        point.error && point.error > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {point.error !== null
                          ? (point.error > 0 ? '+' : '') + (point.error * 100).toFixed(2) + 'pp'
                          : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-400">
                        {point.ptPrice !== null ? point.ptPrice.toFixed(4) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
