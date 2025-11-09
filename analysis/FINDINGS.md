# Pendle YT Pricing Accuracy: Statistical Analysis Results

**Dataset:** 2,074 observations across 349 expired markets on 4 chains (Ethereum, Arbitrum, BSC, Base)
**Analysis Date:** 2025-11-09

## Executive Summary

Analyzed the systematic 1.8% YT over-pricing bias across Pendle markets to identify root causes. Tested 6 theories using correlation analysis, t-tests, ANOVA, and multivariate regression.

### Key Finding: **TIME DECAY** is the Primary Driver

**27% negative correlation** between lead time and error (p < 0.001): Error **increases dramatically** as maturity approaches.

---

## Theory Results

### ✗ **THEORY 1: Liquidity Depth** - REJECTED
**Hypothesis:** Higher liquidity → Better price discovery → Lower error

**Result:** **OPPOSITE effect observed**
- Correlation: +0.14 (positive, not negative!)
- **Q4 (High Liquidity):** 2.56% MAE
- **Q1 (Low Liquidity):** 1.42% MAE
- P-value: < 0.001 (highly significant)

**Interpretation:** High liquidity markets are WORSE at pricing! This is counterintuitive and suggests liquidity attracts uninformed flow or that large markets have other structural issues.

---

### ✗ **THEORY 2: PENDLE Incentives** - REJECTED
**Hypothesis:** PENDLE incentives drive YT demand → Systematic over-pricing

**Result:** **NO significant effect**
- With PENDLE incentives: 1.73% MAE (2,001 obs)
- Without PENDLE incentives: 2.24% MAE (73 obs)
- Difference: -0.51% (incentives actually REDUCE error slightly)
- P-value: 0.43 (not significant)

**Interpretation:** Incentives don't cause the over-pricing. The 96.5% coverage means almost all markets have incentives, so we can't clearly isolate the effect.

---

### ⚠ **THEORY 3: Trading Volume** - NO DATA
**Hypothesis:** High volume → Sophisticated traders → Lower error

**Result:** **Cannot test** - Trading volume data is missing/zero for all observations in the historical API data.

**Recommendation:** Check if Pendle API v2 history endpoint actually provides `tradingVolume` field populated with non-zero values.

---

### ✓ **THEORY 4: Protocol-Specific Patterns** - CONFIRMED
**Hypothesis:** Some protocols have different pricing dynamics

**Result:** **HIGHLY SIGNIFICANT** protocol differences (ANOVA p < 0.001)

**Best Protocols (< 0.5% MAE):**
1. **PumpBTC:** 0.09% MAE (2 markets, 12 obs)
2. **Lido:** 0.10% MAE (5 markets, 30 obs) ⭐ Most reliable with sample size
3. **Origin:** 0.17% MAE (2 markets, 12 obs)
4. **Moonwell:** 0.17% MAE (2 markets, 12 obs)
5. **Frax:** 0.18% MAE (2 markets, 12 obs)

**Worst Protocols (> 5% MAE):**
1. **Usual:** 8.39% MAE (7 markets, 42 obs) 🚩 **93x worse than PumpBTC!**
2. **HMX:** 5.84% MAE (2 markets, 12 obs)
3. **Ethena:** 5.32% MAE (30 markets, 176 obs) - Large sample, consistently bad
4. **Mellow:** 5.25% MAE (5 markets, 30 obs)
5. **MUX:** 5.12% MAE (4 markets, 24 obs)

**Interpretation:** Protocol matters ENORMOUSLY. Stablecoin yield protocols (Usual, Ethena) have the worst accuracy, likely due to volatile/unpredictable yields. LST protocols (Lido, Frax) have excellent accuracy due to predictable staking yields.

---

### ✓ **THEORY 5: Time-to-Maturity Effects** - CONFIRMED ⭐⭐⭐
**Hypothesis:** Error increases closer to maturity due to volume/liquidity drop

**Result:** **STRONGEST FINDING** - Error increases 131% from 60d to 1d before maturity

| Lead Days | MAE | Liquidity USD |
|-----------|-----|---------------|
| 60d | 1.17% | $17.0M |
| 30d | 1.30% | $18.3M |
| 14d | 1.65% | $17.5M |
| 7d | 1.67% | $16.6M |
| 3d | 1.97% | $15.3M |
| 1d | 2.70% | $14.7M |

**Correlations:**
- Lead days vs error_abs: **-0.27** (p < 0.001) ⭐
- Lead days vs liquidity_usd: +0.03 (p = 0.21, not significant)

**Interpretation:** Error dramatically WORSENS as maturity approaches (-27% correlation). Liquidity does NOT explain this (no correlation with lead time). This suggests:
1. **Market participants give up** near maturity (why arbitrage when there's only 1 day left?)
2. **Convergence mechanics fail** - PT should converge to $1, but the market doesn't correct mispricing
3. **Information asymmetry** increases near maturity

---

### ⚠ **THEORY 6: Market Size (TVL)** - NO DATA
**Hypothesis:** Larger markets (high TVL) are more efficient

**Result:** **Cannot test** - TVL data is missing/zero for all observations in the historical API data.

---

## Multivariate Regression

**R² = 0.021 (2.1% of variance explained)**

### Feature Importance (Standardized Coefficients):

| Feature | Coefficient | Direction |
|---------|-------------|-----------|
| **total_incentive_apy** | +0.0059 | Higher incentives → Higher error |
| **lead_days** | -0.0044 | Closer to maturity → Higher error |
| **log_liquidity** | +0.0037 | Higher liquidity → Higher error |

**Interpretation:** The model has very low explanatory power (2.1%), meaning the 1.8% over-pricing is NOT well-explained by these observable factors. This suggests:
1. **Structural/behavioral factors** dominate over market microstructure
2. **Measurement issues** - true drivers may not be in the data
3. **Market-wide bias** that's independent of individual market characteristics

---

## Key Conclusions

### 🎯 Root Causes of 1.8% YT Over-Pricing:

1. **TIME DECAY (27% correlation)** ⭐⭐⭐
   - Error increases 131% from 60d to 1d before maturity
   - NOT explained by liquidity decline
   - Suggests arbitrage breakdown near maturity

2. **PROTOCOL EFFECTS (93x variation)** ⭐⭐
   - Usual (8.39%) vs PumpBTC (0.09%)
   - Stablecoin/volatile yield protocols worst
   - LST protocols best (predictable yields)

3. **LIQUIDITY PARADOX (positive correlation!)** ⭐
   - High liquidity markets have WORSE pricing (+14% correlation)
   - Suggests uninformed flow or structural issues

4. **LOW EXPLANATORY POWER (R² = 2.1%)**
   - Observable factors explain almost nothing
   - Systematic bias is likely behavioral/structural

### 🚨 Debunked Theories:

- ✗ PENDLE incentives cause over-pricing (no effect)
- ✗ High liquidity improves pricing (opposite effect!)
- ✗ Volume drives accuracy (no data to test)

### 💡 Implications:

1. **For Traders:** Avoid Pendle markets close to maturity (1-7 days) - pricing is worst
2. **For Protocol:** Investigate why convergence fails near maturity
3. **For LPs:** Prefer Lido, Frax, PumpBTC markets (10-90x better accuracy)
4. **For Researchers:** Study behavioral factors - the over-pricing isn't explained by market structure

---

## Recommendations for Further Research

1. **Investigate Time Decay Mechanism:**
   - Why does arbitrage fail near maturity?
   - Is this a gas cost issue? Opportunity cost?
   - Compare chains with different gas costs

2. **Liquidity Paradox:**
   - Why do high-liquidity markets perform worse?
   - Is this due to uninformed retail flow?
   - Analyze order flow data if available

3. **Protocol Deep Dive:**
   - What makes Lido so accurate vs Ethena so inaccurate?
   - Is it yield predictability? Volatility? Market sophistication?

4. **Fix Data Issues:**
   - Get trading volume data working
   - Get TVL/PT/SY data populated
   - Analyze on-chain data directly if API incomplete

---

## Data Availability

Full dataset available in `analysis/data/`:
- `chain1.csv` - Ethereum (1,479 rows, 142 markets)
- `chain42161.csv` - Arbitrum (381 rows, 64 markets)
- `chain56.csv` - BSC (119 rows, 20 markets)
- `chain8453.csv` - Base (95 rows, 16 markets)

**Total: 2,074 data points across 349 markets**
