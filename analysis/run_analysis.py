#!/usr/bin/env python3
"""
Pendle YT Pricing Accuracy Analysis
Tests multiple theories for the systematic 1.8% over-pricing bias
"""

import pandas as pd
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Load all chain data
chains = {
    'Ethereum': 1,
    'Arbitrum': 42161,
    'BSC': 56,
    'Base': 8453
}

print("=" * 80)
print("PENDLE YT PRICING ACCURACY ANALYSIS")
print("=" * 80)
print()

# Combine all chains
dfs = []
for name, chain_id in chains.items():
    df = pd.read_csv(f'data/chain{chain_id}.csv')
    df['chain_name'] = name
    dfs.append(df)

df = pd.concat(dfs, ignore_index=True)

print(f"📊 Dataset: {len(df):,} observations across {len(df['market_address'].unique())} markets")
print(f"   Chains: {', '.join(chains.keys())}")
print(f"   Lead times: {sorted(df['lead_days'].unique())}")
print()

# Clean data - remove rows with missing critical fields
df_clean = df.dropna(subset=['error_abs', 'liquidity_usd'])
print(f"✓ Cleaned data: {len(df_clean):,} observations with complete liquidity data")
print()

print("=" * 80)
print("THEORY 1: LIQUIDITY DEPTH VS PRICING ACCURACY")
print("=" * 80)
print("Hypothesis: Higher liquidity → Better price discovery → Lower error")
print()

# Remove zeros and calculate correlation
df_liq = df_clean[df_clean['liquidity_usd'] > 0].copy()
correlation = stats.spearmanr(df_liq['liquidity_usd'], df_liq['error_abs'])
print(f"Spearman correlation (liquidity_usd vs error_abs): {correlation.statistic:.4f}")
print(f"P-value: {correlation.pvalue:.6f} {'***' if correlation.pvalue < 0.001 else '**' if correlation.pvalue < 0.01 else '*' if correlation.pvalue < 0.05 else 'NS'}")
print()

# Quartile analysis
df_liq['liq_quartile'] = pd.qcut(df_liq['liquidity_usd'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])
quartile_stats = df_liq.groupby('liq_quartile')['error_abs'].agg(['mean', 'median', 'std', 'count'])
print("Error by Liquidity Quartile:")
print(quartile_stats.to_string())
print()
print(f"Result: {'✓ CONFIRMED' if correlation.statistic < -0.1 and correlation.pvalue < 0.05 else '✗ REJECTED'}")
print(f"        {abs(correlation.statistic * 100):.1f}% {'negative' if correlation.statistic < 0 else 'positive'} correlation")
print()

print("=" * 80)
print("THEORY 2: INCENTIVE EFFECT ON OVER-PRICING")
print("=" * 80)
print("Hypothesis: PENDLE incentives drive YT demand → Systematic over-pricing")
print()

# Check incentive data availability
df_inc = df_clean.copy()
df_inc['has_pendle_incentive'] = df_inc['pendle_incentive_apy'].notna() & (df_inc['pendle_incentive_apy'] > 0)
df_inc['has_lp_reward'] = df_inc['lp_reward_apy'].notna() & (df_inc['lp_reward_apy'] > 0)
df_inc['total_incentive_apy'] = df_inc[['pendle_incentive_apy', 'lp_reward_apy', 'underlying_reward_apy']].fillna(0).sum(axis=1)

print(f"Markets with PENDLE incentives: {df_inc['has_pendle_incentive'].sum():,} / {len(df_inc):,} ({df_inc['has_pendle_incentive'].mean()*100:.1f}%)")
print(f"Markets with LP rewards: {df_inc['has_lp_reward'].sum():,} / {len(df_inc):,} ({df_inc['has_lp_reward'].mean()*100:.1f}%)")
print()

if df_inc['has_pendle_incentive'].sum() > 30:
    with_incentive = df_inc[df_inc['has_pendle_incentive']]
    without_incentive = df_inc[~df_inc['has_pendle_incentive']]

    t_stat, p_value = stats.ttest_ind(with_incentive['error_abs'], without_incentive['error_abs'])

    print(f"Mean error WITH PENDLE incentives:    {with_incentive['error_abs'].mean():.6f} ({len(with_incentive):,} obs)")
    print(f"Mean error WITHOUT PENDLE incentives: {without_incentive['error_abs'].mean():.6f} ({len(without_incentive):,} obs)")
    print(f"Difference: {(with_incentive['error_abs'].mean() - without_incentive['error_abs'].mean()):.6f}")
    print(f"T-test p-value: {p_value:.6f} {'***' if p_value < 0.001 else '**' if p_value < 0.01 else '*' if p_value < 0.05 else 'NS'}")
    print()
    print(f"Result: {'✓ CONFIRMED' if with_incentive['error_abs'].mean() > without_incentive['error_abs'].mean() and p_value < 0.05 else '✗ REJECTED'}")
else:
    print("⚠ Insufficient data with PENDLE incentives for statistical test")
    print(f"   Testing with total incentive APY instead...")

    df_inc_nonzero = df_inc[df_inc['total_incentive_apy'] > 0]
    if len(df_inc_nonzero) > 30:
        correlation = stats.spearmanr(df_inc_nonzero['total_incentive_apy'], df_inc_nonzero['error_abs'])
        print(f"Correlation (total_incentive_apy vs error_abs): {correlation.statistic:.4f}")
        print(f"P-value: {correlation.pvalue:.6f}")
print()

print("=" * 80)
print("THEORY 3: VOLUME AND PRICE DISCOVERY QUALITY")
print("=" * 80)
print("Hypothesis: High volume → Sophisticated traders → Lower error")
print()

df_vol = df_clean[df_clean['trading_volume'].notna() & (df_clean['trading_volume'] > 0)].copy()
if len(df_vol) > 100:
    correlation = stats.spearmanr(df_vol['trading_volume'], df_vol['error_abs'])
    print(f"Spearman correlation (trading_volume vs error_abs): {correlation.statistic:.4f}")
    print(f"P-value: {correlation.pvalue:.6f} {'***' if correlation.pvalue < 0.001 else '**' if correlation.pvalue < 0.01 else '*' if correlation.pvalue < 0.05 else 'NS'}")
    print()

    # Quartile analysis
    df_vol['vol_quartile'] = pd.qcut(df_vol['trading_volume'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'], duplicates='drop')
    quartile_stats = df_vol.groupby('vol_quartile')['error_abs'].agg(['mean', 'median', 'count'])
    print("Error by Volume Quartile:")
    print(quartile_stats.to_string())
    print()
    print(f"Result: {'✓ CONFIRMED' if correlation.statistic < -0.1 and correlation.pvalue < 0.05 else '✗ REJECTED'}")
else:
    print(f"⚠ Insufficient volume data: {len(df_vol)} observations with trading volume")
print()

print("=" * 80)
print("THEORY 4: PROTOCOL-SPECIFIC PATTERNS")
print("=" * 80)
print("Hypothesis: Some protocols have different pricing dynamics")
print()

protocol_stats = df_clean.groupby('protocol').agg({
    'error_abs': ['mean', 'median', 'std'],
    'error_signed': 'mean',
    'market_address': 'nunique',
    'chain_id': 'count'
}).round(6)
protocol_stats.columns = ['MAE', 'Median_AE', 'Std_AE', 'Mean_Signed_Error', 'N_Markets', 'N_Obs']
protocol_stats = protocol_stats[protocol_stats['N_Obs'] >= 10].sort_values('MAE')

print("Protocol Performance (min 10 observations):")
print(protocol_stats.to_string())
print()

# ANOVA test
protocols_enough_data = protocol_stats[protocol_stats['N_Obs'] >= 30].index
if len(protocols_enough_data) >= 3:
    groups = [df_clean[df_clean['protocol'] == p]['error_abs'].values for p in protocols_enough_data]
    f_stat, p_value = stats.f_oneway(*groups)
    print(f"ANOVA F-statistic: {f_stat:.4f}")
    print(f"P-value: {p_value:.6f} {'***' if p_value < 0.001 else '**' if p_value < 0.01 else '*' if p_value < 0.05 else 'NS'}")
    print()
    print(f"Result: {'✓ CONFIRMED - Significant protocol differences' if p_value < 0.05 else '✗ REJECTED - No significant differences'}")
else:
    print("⚠ Insufficient data for ANOVA test across protocols")
print()

print("=" * 80)
print("THEORY 5: TIME-TO-MATURITY EFFECTS")
print("=" * 80)
print("Hypothesis: Error increases closer to maturity due to volume/liquidity drop")
print()

lead_stats = df_clean.groupby('lead_days').agg({
    'error_abs': ['mean', 'median'],
    'liquidity_usd': 'mean',
    'trading_volume': 'mean',
    'chain_id': 'count'
})
lead_stats.columns = ['MAE', 'Median_AE', 'Avg_Liquidity', 'Avg_Volume', 'N_Obs']
lead_stats = lead_stats.sort_index(ascending=False)
print("Metrics by Lead Time:")
print(lead_stats.to_string())
print()

# Correlation: lead_days vs error
corr_lead_error = stats.spearmanr(df_clean['lead_days'], df_clean['error_abs'])
print(f"Correlation (lead_days vs error_abs): {corr_lead_error.statistic:.4f}")
print(f"P-value: {corr_lead_error.pvalue:.6f} {'***' if corr_lead_error.pvalue < 0.001 else '**' if corr_lead_error.pvalue < 0.01 else '*' if corr_lead_error.pvalue < 0.05 else 'NS'}")
print()

# Correlation: lead_days vs liquidity
df_liq_time = df_clean[df_clean['liquidity_usd'] > 0]
corr_lead_liq = stats.spearmanr(df_liq_time['lead_days'], df_liq_time['liquidity_usd'])
print(f"Correlation (lead_days vs liquidity_usd): {corr_lead_liq.statistic:.4f}")
print(f"P-value: {corr_lead_liq.pvalue:.6f} {'***' if corr_lead_liq.pvalue < 0.001 else '**' if corr_lead_liq.pvalue < 0.01 else '*' if corr_lead_liq.pvalue < 0.05 else 'NS'}")
print()

df_vol_time = df_clean[df_clean['trading_volume'].notna() & (df_clean['trading_volume'] > 0)]
if len(df_vol_time) > 100:
    corr_lead_vol = stats.spearmanr(df_vol_time['lead_days'], df_vol_time['trading_volume'])
    print(f"Correlation (lead_days vs trading_volume): {corr_lead_vol.statistic:.4f}")
    print(f"P-value: {corr_lead_vol.pvalue:.6f}")
    print()

print(f"Result: Error {'INCREASES' if corr_lead_error.statistic < 0 else 'DECREASES'} as maturity approaches")
print(f"        Liquidity {'DECREASES' if corr_lead_liq.statistic > 0 else 'INCREASES'} closer to maturity")
print()

print("=" * 80)
print("THEORY 6: MARKET SIZE AND EFFICIENCY")
print("=" * 80)
print("Hypothesis: Larger markets (high TVL) are more efficient")
print()

df_tvl = df_clean[df_clean['total_tvl'].notna() & (df_clean['total_tvl'] > 0)].copy()
if len(df_tvl) > 100:
    correlation = stats.spearmanr(df_tvl['total_tvl'], df_tvl['error_abs'])
    print(f"Spearman correlation (total_tvl vs error_abs): {correlation.statistic:.4f}")
    print(f"P-value: {correlation.pvalue:.6f} {'***' if correlation.pvalue < 0.001 else '**' if correlation.pvalue < 0.01 else '*' if correlation.pvalue < 0.05 else 'NS'}")
    print()

    # Quartile analysis
    df_tvl['tvl_quartile'] = pd.qcut(df_tvl['total_tvl'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'], duplicates='drop')
    quartile_stats = df_tvl.groupby('tvl_quartile')['error_abs'].agg(['mean', 'median', 'count'])
    print("Error by TVL Quartile:")
    print(quartile_stats.to_string())
    print()
    print(f"Result: {'✓ CONFIRMED' if correlation.statistic < -0.1 and correlation.pvalue < 0.05 else '✗ REJECTED'}")
else:
    print(f"⚠ Insufficient TVL data: {len(df_tvl)} observations")
print()

print("=" * 80)
print("MULTIVARIATE REGRESSION ANALYSIS")
print("=" * 80)
print("Predicting error_abs from multiple factors")
print()

# Prepare regression data
df_reg = df_clean.copy()
df_reg = df_reg[
    (df_reg['liquidity_usd'] > 0) &
    (df_reg['liquidity_usd'].notna())
].copy()

# Create features
X_cols = ['liquidity_usd', 'lead_days']
if 'trading_volume' in df_reg.columns and df_reg['trading_volume'].notna().sum() > len(df_reg) * 0.5:
    df_reg['trading_volume'] = df_reg['trading_volume'].fillna(0)
    X_cols.append('trading_volume')

if 'total_tvl' in df_reg.columns and df_reg['total_tvl'].notna().sum() > len(df_reg) * 0.5:
    df_reg['total_tvl'] = df_reg['total_tvl'].fillna(0)
    X_cols.append('total_tvl')

df_reg['total_incentive_apy'] = df_reg[['pendle_incentive_apy', 'lp_reward_apy', 'underlying_reward_apy']].fillna(0).sum(axis=1)
X_cols.append('total_incentive_apy')

# Log transform for skewed variables
df_reg['log_liquidity'] = np.log1p(df_reg['liquidity_usd'])
X_cols_final = ['log_liquidity', 'lead_days', 'total_incentive_apy']

if 'trading_volume' in X_cols:
    df_reg['log_volume'] = np.log1p(df_reg['trading_volume'])
    X_cols_final.append('log_volume')

if 'total_tvl' in X_cols:
    df_reg['log_tvl'] = np.log1p(df_reg['total_tvl'])
    X_cols_final.append('log_tvl')

X = df_reg[X_cols_final].values
y = df_reg['error_abs'].values

# Standardize features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Fit regression
model = LinearRegression()
model.fit(X_scaled, y)

# Calculate R²
r2 = model.score(X_scaled, y)

print(f"R² Score: {r2:.4f} ({r2*100:.1f}% of variance explained)")
print()
print("Feature Coefficients (standardized):")
for i, col in enumerate(X_cols_final):
    print(f"  {col:25s}: {model.coef_[i]:+.6f}")
print(f"  {'Intercept':25s}: {model.intercept_:+.6f}")
print()

# Feature importance (absolute coefficient values)
feature_importance = pd.DataFrame({
    'Feature': X_cols_final,
    'Coefficient': model.coef_,
    'Abs_Coefficient': np.abs(model.coef_)
}).sort_values('Abs_Coefficient', ascending=False)

print("Feature Importance (by absolute coefficient):")
print(feature_importance[['Feature', 'Coefficient', 'Abs_Coefficient']].to_string(index=False))
print()

print("=" * 80)
print("KEY FINDINGS SUMMARY")
print("=" * 80)
print()
print("🔍 Root Causes of 1.8% YT Over-Pricing:")
print()

# Determine key findings
findings = []

if abs(corr_lead_error.statistic) > 0.2 and corr_lead_error.pvalue < 0.05:
    findings.append(f"1. TIME DECAY: Error {'increases' if corr_lead_error.statistic < 0 else 'decreases'} by {abs(corr_lead_error.statistic)*100:.1f}% as maturity approaches")

if len(protocol_stats) > 0:
    best_protocol = protocol_stats.iloc[0]
    worst_protocol = protocol_stats.iloc[-1]
    findings.append(f"2. PROTOCOL EFFECT: {worst_protocol.name} worst ({worst_protocol['MAE']:.4f}) vs {best_protocol.name} best ({best_protocol['MAE']:.4f})")

regression_drivers = feature_importance.head(2)['Feature'].tolist()
findings.append(f"3. PRIMARY DRIVERS: {', '.join(regression_drivers)} (regression R²={r2:.3f})")

if df_inc['has_pendle_incentive'].sum() > 30:
    incentive_diff = with_incentive['error_abs'].mean() - without_incentive['error_abs'].mean()
    if abs(incentive_diff) > 0.001:
        findings.append(f"4. INCENTIVE EFFECT: {incentive_diff*100:+.2f}% error with PENDLE incentives")

for i, finding in enumerate(findings, 1):
    if finding.startswith(str(i)):
        print(finding)
    else:
        print(finding)

print()
print("=" * 80)
print("Analysis complete! Check analysis/data/ for raw CSV files.")
print("=" * 80)
