"""
eda.py
Data cleaning, exploratory analysis, stationarity testing, and risk metrics
for Task 1 of the GMF portfolio forecasting project.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller


def clean_asset(df: pd.DataFrame) -> pd.DataFrame:
    """Ensures a clean, fully-indexed, typed daily series with no gaps/NaNs."""
    df = df.copy()
    df.index = pd.to_datetime(df.index)
    full_range = pd.bdate_range(df.index.min(), df.index.max())
    df = df.reindex(full_range)
    df = df.astype(float)
    df = df.ffill().bfill()
    df.index.name = "Date"
    return df


def add_return_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds daily return, log return, rolling vol, rolling mean columns."""
    df = df.copy()
    df["Daily Return"] = df["Adj Close"].pct_change()
    df["Log Return"] = np.log(df["Adj Close"] / df["Adj Close"].shift(1))
    df["Rolling Mean 30D"] = df["Adj Close"].rolling(30).mean()
    df["Rolling Vol 30D"] = df["Daily Return"].rolling(30).std()
    df["Rolling Vol 90D"] = df["Daily Return"].rolling(90).std()
    return df


def detect_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.DataFrame:
    """Flags days whose return exceeds z_thresh standard deviations."""
    r = df["Daily Return"].dropna()
    z = (r - r.mean()) / r.std()
    outliers = r[z.abs() > z_thresh]
    return outliers.to_frame("Daily Return")


def adf_test(series: pd.Series, label: str = "") -> dict:
    """Runs the Augmented Dickey-Fuller test and returns a summary dict."""
    series = series.dropna()
    result = adfuller(series, autolag="AIC")
    return {
        "series": label,
        "adf_statistic": float(result[0]),
        "p_value": float(result[1]),
        "n_lags": int(result[2]),
        "n_obs": int(result[3]),
        "critical_values": {k: float(v) for k, v in result[4].items()},
        "is_stationary": bool(result[1] < 0.05),
    }


def value_at_risk(returns: pd.Series, confidence: float = 0.95) -> float:
    """Historical (empirical) daily VaR at the given confidence level."""
    returns = returns.dropna()
    return float(np.percentile(returns, (1 - confidence) * 100))


def sharpe_ratio(returns: pd.Series, risk_free_annual: float = 0.045) -> float:
    """Annualized Sharpe ratio from daily returns."""
    returns = returns.dropna()
    rf_daily = risk_free_annual / 252
    excess = returns - rf_daily
    std = excess.std()
    if std < 1e-12:
        return 0.0
    return float(excess.mean() / std * np.sqrt(252))


def summarize_asset(name: str, df: pd.DataFrame) -> dict:
    """Full Task 1 summary for one asset: stats, stationarity, risk metrics."""
    r = df["Daily Return"].dropna()
    return {
        "asset": name,
        "start_price": float(df["Adj Close"].iloc[0]),
        "end_price": float(df["Adj Close"].iloc[-1]),
        "total_return_pct": float((df["Adj Close"].iloc[-1] / df["Adj Close"].iloc[0] - 1) * 100),
        "annualized_return_pct": float(r.mean() * 252 * 100),
        "annualized_volatility_pct": float(r.std() * np.sqrt(252) * 100),
        "sharpe_ratio": sharpe_ratio(r),
        "var_95_daily_pct": value_at_risk(r, 0.95) * 100,
        "var_99_daily_pct": value_at_risk(r, 0.99) * 100,
        "max_daily_gain_pct": float(r.max() * 100),
        "max_daily_loss_pct": float(r.min() * 100),
        "n_outlier_days": len(detect_outliers(df)),
        "adf_price": adf_test(df["Adj Close"], f"{name} Adj Close"),
        "adf_returns": adf_test(r, f"{name} Daily Return"),
    }