"""
Basic unit tests for the core pipeline logic (data cleaning, metrics,
portfolio math) -- run with: pytest tests/
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from src import eda, models, portfolio_optimization as po


def _dummy_series(n=300, seed=0):
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2023-01-01", periods=n)
    prices = 100 * np.exp(np.cumsum(rng.normal(0.0003, 0.02, n)))
    return pd.Series(prices, index=dates)


def test_clean_asset_fills_gaps():
    dates = pd.bdate_range("2023-01-01", periods=10)
    df = pd.DataFrame({"Open": 1, "High": 1, "Low": 1, "Close": 1,
                        "Adj Close": 1, "Volume": 100}, index=dates)
    df = df.drop(df.index[3])
    cleaned = eda.clean_asset(df)
    assert cleaned.isna().sum().sum() == 0
    assert len(cleaned) == 10


def test_metrics_dict_perfect_prediction():
    y = np.array([100, 101, 102])
    m = models.metrics_dict(y, y)
    assert m["MAE"] == 0 and m["RMSE"] == 0 and m["MAPE"] == 0


def test_adf_test_stationary_series():
    rng = np.random.default_rng(1)
    white_noise = pd.Series(rng.normal(0, 1, 500))
    result = eda.adf_test(white_noise, "white_noise")
    assert result["is_stationary"] is True


def test_portfolio_perf_weights_sum_to_one():
    mu = pd.Series({"TSLA": 0.2, "BND": 0.02, "SPY": 0.1})
    cov = pd.DataFrame(np.eye(3) * 0.04, index=mu.index, columns=mu.index)
    w = np.array([1 / 3, 1 / 3, 1 / 3])
    ret, vol, sharpe = po.portfolio_perf(w, mu, cov)
    assert abs(ret - mu.mean()) < 1e-9
    assert vol > 0


def test_sharpe_ratio_zero_vol_returns_zero():
    r = pd.Series([0.0] * 50)
    assert eda.sharpe_ratio(r) == 0.0
