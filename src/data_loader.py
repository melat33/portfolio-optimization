"""
data_loader.py
Fetches historical OHLCV data for TSLA, BND, SPY from YFinance.

In production (with internet access to Yahoo Finance), this pulls real
market data directly. In restricted/offline environments it falls back to a
calibrated synthetic generator (geometric Brownian motion + regime drift,
parameterized to match each asset's real historical risk/return profile) so
the rest of the pipeline can still be developed, tested, and demoed.

Usage:
    from src.data_loader import load_all_assets
    data = load_all_assets(start="2015-01-01", end="2026-01-15")
"""

import os
import warnings
import numpy as np
import pandas as pd

TICKERS = ["TSLA", "BND", "SPY"]

# Calibrated to each asset's real long-run characteristics (annualized).
# TSLA: high growth, high vol. BND: low return, low vol (bond ETF).
# SPY: moderate return, moderate vol (broad market).
ASSET_PARAMS = {
    "TSLA": {"mu": 0.34, "sigma": 0.50, "start_price": 14.62, "jump_prob": 0.012, "jump_scale": 0.09},
    "BND":  {"mu": 0.022, "sigma": 0.06, "start_price": 72.50, "jump_prob": 0.002, "jump_scale": 0.015},
    "SPY":  {"mu": 0.12, "sigma": 0.165, "start_price": 205.00, "jump_prob": 0.005, "jump_scale": 0.035},
}


def _business_days(start: str, end: str) -> pd.DatetimeIndex:
    return pd.bdate_range(start=start, end=end)


def _synthetic_ohlcv(ticker: str, start: str, end: str, seed: int = 9) -> pd.DataFrame:
    """Generates a realistic daily OHLCV series via jump-diffusion GBM."""
    rng = np.random.default_rng(seed + sum(ord(c) for c in ticker))
    dates = _business_days(start, end)
    n = len(dates)
    params = ASSET_PARAMS[ticker]
    dt = 1 / 252

    drift = (params["mu"] - 0.5 * params["sigma"] ** 2) * dt
    shocks = rng.normal(drift, params["sigma"] * np.sqrt(dt), n)

    jumps = rng.random(n) < params["jump_prob"]
    jump_sizes = rng.normal(0, params["jump_scale"], n) * jumps

    log_returns = shocks + jump_sizes
    # mild mean-reverting volatility regime (GARCH-ish clustering)
    vol_regime = 1 + 0.5 * np.sin(np.linspace(0, 14, n)) * (rng.random(n) < 0.3)
    log_returns *= vol_regime

    log_prices = np.log(params["start_price"]) + np.cumsum(log_returns)
    close = np.exp(log_prices)

    daily_range = np.abs(rng.normal(0, params["sigma"] * np.sqrt(dt) * 0.6, n)) * close
    open_ = close * (1 + rng.normal(0, 0.002, n))
    high = np.maximum(open_, close) + daily_range * rng.random(n)
    low = np.minimum(open_, close) - daily_range * rng.random(n)
    low = np.maximum(low, 0.01)

    base_vol = {"TSLA": 90_000_000, "BND": 4_500_000, "SPY": 70_000_000}[ticker]
    volume = (base_vol * (1 + 0.5 * np.abs(log_returns) / params["sigma"]) *
              rng.uniform(0.6, 1.4, n)).astype(np.int64)

    df = pd.DataFrame({
        "Date": dates, "Open": open_, "High": high, "Low": low,
        "Close": close, "Adj Close": close, "Volume": volume,
    })
    return df.set_index("Date")


def fetch_ticker(ticker: str, start: str, end: str, use_synthetic_fallback: bool = True) -> pd.DataFrame:
    """Fetch one ticker via yfinance; fall back to synthetic data on failure."""
    try:
        import yfinance as yf
        df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=False, timeout=10)
        if df is None or df.empty:
            raise ValueError("empty response from yfinance")
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.index.name = "Date"
        return df[["Open", "High", "Low", "Close", "Adj Close", "Volume"]]
    except Exception as e:
        if not use_synthetic_fallback:
            raise
        warnings.warn(
            f"[data_loader] Live fetch for {ticker} failed ({e}). "
            f"Using calibrated synthetic data instead. Re-run with internet "
            f"access to Yahoo Finance for real market data."
        )
        return _synthetic_ohlcv(ticker, start, end)


def load_all_assets(start: str = "2015-01-01", end: str = "2026-01-15",
                     save_raw: bool = True, raw_dir: str = "data/raw") -> dict:
    """Loads TSLA, BND, SPY into a dict of DataFrames, optionally caching raw CSVs."""
    data = {}
    for ticker in TICKERS:
        df = fetch_ticker(ticker, start, end)
        df = df[~df.index.duplicated(keep="first")].sort_index()
        data[ticker] = df
        if save_raw:
            os.makedirs(raw_dir, exist_ok=True)
            df.to_csv(os.path.join(raw_dir, f"{ticker}.csv"))
    return data


if __name__ == "__main__":
    d = load_all_assets()
    for t, df in d.items():
        print(t, df.shape, df.index.min().date(), "->", df.index.max().date())