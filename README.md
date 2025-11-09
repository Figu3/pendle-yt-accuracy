# Pendle YT Pricing Accuracy Dashboard

A comprehensive web dashboard that analyzes how accurate Pendle YT (Yield Token) pricing was for expired Pendle markets by comparing implied APY vs realized forward yields.

## Overview

This dashboard fetches real on-chain data from the Pendle Core API to evaluate ex-post accuracy of YT pricing across different time horizons before maturity. It helps answer: **"How well did Pendle markets predict actual yields?"**

## Features

- **Real-time Analysis**: Analyzes all expired Pendle markets on Ethereum
- **Multiple Time Horizons**: Evaluates accuracy at 90, 60, 30, 14, 7, 3, and 1 days before maturity
- **Interactive Visualizations**: Charts showing implied vs realized APY trends and prediction errors
- **Comprehensive Metrics**:
  - Mean Absolute Error (MAE)
  - Mean Signed Error (bias detection)
  - Relative errors
- **Search & Filters**: Filter by market name, protocol, or minimum data points
- **Detailed Breakdowns**: Click any market for full historical analysis
- **Caching**: 12-hour TTL cache for faster subsequent loads

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Recharts** for visualizations
- **Pendle Core API** for all data

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Data Collection

1. **Fetch Expired Markets**: Queries Pendle API for all markets where `expiry < now`
2. **Get Historical Data**: For each market, fetches full price/APY history via `/v2/{chainId}/markets/{address}/history`
3. **Extract Data Points**: At each lead time (e.g., 30 days before maturity), finds the closest historical data point

### Accuracy Calculation

For each lead time horizon:

```typescript
// Calculate realized APY from PT price
PT_price = 1 - ptDiscount
τ = days_to_maturity / 365
realizedApy = (1 / PT_price - 1) / τ

// Calculate errors
error = impliedApy - realizedApy
absError = |error|
relError = (error / realizedApy) * 100
```

### Metrics

- **MAE (Mean Absolute Error)**: Average magnitude of prediction errors
- **MSE (Mean Signed Error)**: Average direction of errors (detects systematic bias)
- **Relative Error**: Percentage error relative to realized yield

## Project Structure

```
pendle-yt-accuracy/
├── app/
│   ├── api/pendle/markets/
│   │   ├── route.ts              # GET /api/pendle/markets
│   │   └── [market]/route.ts     # GET /api/pendle/markets/:address
│   ├── page.tsx                  # Main dashboard UI
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── lib/
│   ├── pendleApi.ts              # Pendle API client
│   ├── pendleAnalytics.ts        # Analytics engine
│   └── cache.ts                  # Caching helper
├── types/
│   └── pendle.ts                 # TypeScript types
└── .cache/pendle/                # JSON cache files (gitignored)
```

## API Routes

### `GET /api/pendle/markets`

Returns analysis summary for all expired markets.

**Query Parameters:**
- `chainId` (default: 1) - Chain ID to analyze
- `cache` (default: true) - Use cached data

**Response:**
```json
{
  "totalExpiredMarkets": 150,
  "marketsWithData": 145,
  "overallMAE": 0.0234,
  "overallMSE": -0.0012,
  "markets": [...]
}
```

### `GET /api/pendle/markets/[address]`

Returns detailed analysis for a specific market.

**Query Parameters:**
- `chainId` (default: 1)
- `cache` (default: true)

## Findings & Insights

Use this dashboard to discover:

- Which protocols have the most accurate YT pricing
- How prediction accuracy changes as maturity approaches
- Whether markets systematically over/under-price yields
- Which market types are hardest to predict

## Caching

- Cache location: `.cache/pendle/`
- TTL: 12 hours
- Clear cache: Delete files in `.cache/pendle/`

## Performance Notes

- Initial load may take 1-2 minutes to analyze all expired markets
- Subsequent loads use cached data (fast)
- Analysis runs in batches to avoid rate limiting

## Future Enhancements

- Multi-chain support (Arbitrum, Optimism, etc.)
- Export to CSV
- Time-series aggregation by protocol
- Confidence intervals
- Directional accuracy metrics

## Data Source

All data from [Pendle Core API](https://api-v2.pendle.finance/core/docs):
- Market metadata
- Historical implied APY
- PT discount rates
- Underlying APY

No external API keys required!

## License

MIT
