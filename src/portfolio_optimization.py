"""
portfolio_optimization.py
Task 4: Modern Portfolio Theory. Builds the efficient frontier from a
forecast-informed expected-return vector (TSLA from the model; BND/SPY
from historical annualized returns) and the historical covariance matrix.
"""

import numpy as np
import pandas as pd


def annualized_cov_matrix(returns: pd.DataFrame) -> pd.DataFrame:
    return returns.cov() * 252


def expected_returns_vector(tsla_forecast_annual_return: float,
                             hist_returns: pd.DataFrame) -> pd.Series:
    """TSLA uses the model's forecasted annualized return; BND/SPY use history."""
    mu = hist_returns.mean() * 252
    mu["TSLA"] = tsla_forecast_annual_return
    return mu[["TSLA", "BND", "SPY"]]


def portfolio_perf(weights: np.ndarray, mu: pd.Series, cov: pd.DataFrame, rf: float = 0.045):
    ret = float(np.dot(weights, mu))
    vol = float(np.sqrt(weights @ cov.values @ weights))
    sharpe = (ret - rf) / vol if vol > 0 else 0.0
    return ret, vol, sharpe


def random_portfolios(mu: pd.Series, cov: pd.DataFrame, n: int = 20000, rf: float = 0.045, seed: int = 7):
    rng = np.random.default_rng(seed)
    n_assets = len(mu)
    results = np.zeros((n, 3))
    weights_list = np.zeros((n, n_assets))
    for i in range(n):
        w = rng.random(n_assets)
        w /= w.sum()
        ret, vol, sharpe = portfolio_perf(w, mu, cov, rf)
        results[i] = [ret, vol, sharpe]
        weights_list[i] = w
    return results, weights_list


def optimize_mpt(mu: pd.Series, cov: pd.DataFrame, rf: float = 0.045):
    """
    Finds Max-Sharpe and Min-Volatility portfolios. Uses PyPortfolioOpt if
    available; otherwise falls back to constrained scipy optimization.
    """
    try:
        from pypfopt import EfficientFrontier
        from pypfopt import objective_functions

        ef_max = EfficientFrontier(mu, cov, weight_bounds=(0, 1))
        ef_max.max_sharpe(risk_free_rate=rf)
        w_max = ef_max.clean_weights()
        ret_max, vol_max, sharpe_max = ef_max.portfolio_performance(risk_free_rate=rf)

        ef_min = EfficientFrontier(mu, cov, weight_bounds=(0, 1))
        ef_min.min_volatility()
        w_min = ef_min.clean_weights()
        ret_min, vol_min, sharpe_min = ef_min.portfolio_performance(risk_free_rate=rf)

        return {
            "max_sharpe": {"weights": dict(w_max), "return": ret_max, "volatility": vol_max, "sharpe": sharpe_max},
            "min_volatility": {"weights": dict(w_min), "return": ret_min, "volatility": vol_min, "sharpe": sharpe_min},
        }
    except Exception:
        from scipy.optimize import minimize

        n = len(mu)
        bounds = tuple((0, 1) for _ in range(n))
        constraints = ({"type": "eq", "fun": lambda w: np.sum(w) - 1},)
        x0 = np.repeat(1 / n, n)

        neg_sharpe = lambda w: -portfolio_perf(w, mu, cov, rf)[2]
        vol_only = lambda w: portfolio_perf(w, mu, cov, rf)[1]

        res_sharpe = minimize(neg_sharpe, x0, method="SLSQP", bounds=bounds, constraints=constraints)
        res_vol = minimize(vol_only, x0, method="SLSQP", bounds=bounds, constraints=constraints)

        def pack(res):
            w = res.x
            ret, vol, sharpe = portfolio_perf(w, mu, cov, rf)
            return {"weights": dict(zip(mu.index, w)), "return": ret, "volatility": vol, "sharpe": sharpe}

        return {"max_sharpe": pack(res_sharpe), "min_volatility": pack(res_vol)}