"""
backtest.py
Task 5: Simulates the recommended MPT portfolio over a held-out backtest
window and compares it against a static 60/40 SPY/BND benchmark.
"""

import numpy as np
import pandas as pd


def simulate_static_hold(returns: pd.DataFrame, weights: dict) -> pd.Series:
    """Buy-and-hold: weights drift with performance, no rebalancing."""
    w = np.array([weights[c] for c in returns.columns])
    asset_growth = (1 + returns).cumprod()
    values = asset_growth.values * w
    portfolio_value = values.sum(axis=1)
    portfolio_return = pd.Series(portfolio_value, index=returns.index) / portfolio_value[0]
    return portfolio_return - 0  # cumulative growth factor series (starts at ~1)


def simulate_monthly_rebalance(returns: pd.DataFrame, weights: dict) -> pd.Series:
    """Rebalances back to target weights at the start of each calendar month."""
    w_target = np.array([weights[c] for c in returns.columns])
    dates = returns.index
    portfolio_value = [1.0]
    current_alloc = w_target.copy()
    last_month = dates[0].month

    for i in range(1, len(dates)):
        if dates[i].month != last_month:
            current_alloc = w_target.copy()
            last_month = dates[i].month
        day_ret = float(np.dot(current_alloc, returns.iloc[i].values))
        new_val = portfolio_value[-1] * (1 + day_ret)
        portfolio_value.append(new_val)
        # drift allocation with relative asset performance until next rebalance
        asset_factors = 1 + returns.iloc[i].values
        current_alloc = current_alloc * asset_factors
        current_alloc = current_alloc / current_alloc.sum()

    return pd.Series(portfolio_value, index=dates)


def performance_summary(cum_growth: pd.Series, rf: float = 0.045) -> dict:
    daily_returns = cum_growth.pct_change().dropna()
    total_return = float(cum_growth.iloc[-1] / cum_growth.iloc[0] - 1)
    n_days = len(cum_growth)
    ann_return = float((cum_growth.iloc[-1] / cum_growth.iloc[0]) ** (252 / n_days) - 1)
    ann_vol = float(daily_returns.std() * np.sqrt(252))
    sharpe = float((ann_return - rf) / ann_vol) if ann_vol > 0 else 0.0
    running_max = cum_growth.cummax()
    drawdown = cum_growth / running_max - 1
    max_dd = float(drawdown.min())
    return {
        "total_return_pct": total_return * 100,
        "annualized_return_pct": ann_return * 100,
        "annualized_volatility_pct": ann_vol * 100,
        "sharpe_ratio": sharpe,
        "max_drawdown_pct": max_dd * 100,
    }