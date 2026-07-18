"""
run_pipeline.py
End-to-end execution of Tasks 1-5. Produces:
  - data/processed/<ticker>_processed.csv
  - outputs/plots/*.png
  - outputs/results/results.json   (consumed by the React dashboard)

Run from the project root:
    python scripts/run_pipeline.py
"""

import sys
import os
import json
import warnings

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from src.data_loader import load_all_assets
from src import eda
from src import models
from src import portfolio_optimization as po
from src import backtest as bt

PLOTS_DIR = "outputs/plots"
RESULTS_DIR = "outputs/results"
PROCESSED_DIR = "data/processed"
for d in (PLOTS_DIR, RESULTS_DIR, PROCESSED_DIR):
    os.makedirs(d, exist_ok=True)

START, END = "2015-01-01", "2026-01-15"
TRAIN_TEST_SPLIT = "2025-01-01"
BACKTEST_START = "2025-01-15"

plt.rcParams.update({
    "figure.facecolor": "#0e1a2b", "axes.facecolor": "#0e1a2b",
    "savefig.facecolor": "#0e1a2b", "axes.edgecolor": "#3a4a63",
    "axes.labelcolor": "#d8dee9", "text.color": "#d8dee9",
    "xtick.color": "#9aa7bd", "ytick.color": "#9aa7bd",
    "grid.color": "#22314a", "font.size": 10,
})
COLORS = {"TSLA": "#e0b04c", "BND": "#3fb8af", "SPY": "#5b8def",
          "forecast": "#e0b04c", "ci": "#e0b04c33", "benchmark": "#5b8def"}


def savefig(name):
    path = os.path.join(PLOTS_DIR, name)
    plt.tight_layout()
    plt.savefig(path, dpi=130)
    plt.close()
    print(f"  saved {path}")


def main():
    results = {}

    # ---------------------------------------------------------- Task 1 ----
    print("[1/5] Loading & cleaning data...")
    raw = load_all_assets(START, END)
    clean = {t: eda.add_return_features(eda.clean_asset(df)) for t, df in raw.items()}
    for t, df in clean.items():
        df.to_csv(os.path.join(PROCESSED_DIR, f"{t}_processed.csv"))

    print("[1/5] Running EDA & risk metrics...")
    asset_summaries = {t: eda.summarize_asset(t, df) for t, df in clean.items()}

    # Monthly-resampled, normalized (base=100) price series for the frontend chart
    price_series = []
    monthly = {t: clean[t]["Adj Close"].resample("ME").last() for t in clean}
    common_idx = monthly["TSLA"].index
    for d in common_idx:
        row = {"date": d.strftime("%Y-%m-%d")}
        for t in clean:
            row[t] = float(monthly[t].loc[d] / monthly[t].iloc[0] * 100)
        price_series.append(row)

    # TSLA daily-return histogram (for the distribution chart)
    tsla_r = clean["TSLA"]["Daily Return"].dropna() * 100
    counts, bin_edges = np.histogram(tsla_r, bins=40)
    return_histogram = [
        {"bin": float((bin_edges[i] + bin_edges[i + 1]) / 2), "count": int(counts[i])}
        for i in range(len(counts))
    ]

    # TSLA 30-day rolling volatility series
    rolling_vol = [
        {"date": d.strftime("%Y-%m-%d"), "vol": float(v * 100)}
        for d, v in clean["TSLA"]["Rolling Vol 30D"].dropna().resample("W").last().items()
    ]

    results["task1_eda"] = {
        "assets": asset_summaries,
        "price_series": price_series,
        "return_histogram": return_histogram,
        "rolling_vol_series": rolling_vol,
    }

    plt.figure(figsize=(10, 5))
    for t in clean:
        norm = clean[t]["Adj Close"] / clean[t]["Adj Close"].iloc[0] * 100
        plt.plot(norm.index, norm, label=t, color=COLORS[t], linewidth=1.4)
    plt.title("Normalized Price Growth (Base = 100)")
    plt.legend()
    plt.grid(alpha=0.3)
    savefig("01_normalized_prices.png")

    plt.figure(figsize=(10, 4))
    plt.plot(clean["TSLA"].index, clean["TSLA"]["Rolling Vol 30D"] * 100, color=COLORS["TSLA"])
    plt.title("TSLA 30-Day Rolling Volatility (%)")
    plt.grid(alpha=0.3)
    savefig("02_tsla_rolling_vol.png")

    plt.figure(figsize=(10, 4))
    plt.hist(clean["TSLA"]["Daily Return"].dropna() * 100, bins=100, color=COLORS["TSLA"], alpha=0.85)
    plt.title("TSLA Daily Return Distribution (%)")
    plt.grid(alpha=0.3)
    savefig("03_tsla_return_distribution.png")

    # ---------------------------------------------------------- Task 2 ----
    print("[2/5] Training ARIMA and LSTM on TSLA...")
    tsla_close = clean["TSLA"]["Adj Close"]
    train, test = models.chronological_split(tsla_close, TRAIN_TEST_SPLIT)

    arima_model = models.fit_arima(train)
    arima_fc, arima_ci = models.forecast_arima(arima_model, len(test))
    arima_metrics = models.metrics_dict(test.values, arima_fc)

    lstm_model, scaler, history = models.train_lstm(train, window=60, epochs=40)
    lstm_fc = models.forecast_lstm(lstm_model, scaler, train, len(test), window=60)
    lstm_metrics = models.metrics_dict(test.values, lstm_fc)

    best_model = "LSTM" if lstm_metrics["RMSE"] < arima_metrics["RMSE"] else "ARIMA"

    results["task2_models"] = {
        "train_size": len(train), "test_size": len(test),
        "split_date": TRAIN_TEST_SPLIT,
        "arima": {"order": list(arima_model.order), "metrics": arima_metrics},
        "lstm": {"window": 60, "hidden_size": 64, "num_layers": 2, "epochs": 40,
                 "final_train_loss": history[-1], "metrics": lstm_metrics},
        "best_model": best_model,
        "test_series": [
            {"date": d.strftime("%Y-%m-%d"), "actual": float(a), "arima": float(f1), "lstm": float(f2)}
            for d, a, f1, f2 in zip(test.index, test.values, arima_fc, lstm_fc)
        ][::2],
    }

    plt.figure(figsize=(11, 5))
    plt.plot(train.index[-150:], train.values[-150:], color="#7a879c", label="Train (last 150d)")
    plt.plot(test.index, test.values, color="#d8dee9", label="Actual", linewidth=1.6)
    plt.plot(test.index, arima_fc, color="#e0b04c", label="ARIMA Forecast", linewidth=1.3)
    plt.plot(test.index, lstm_fc, color="#3fb8af", label="LSTM Forecast", linewidth=1.3)
    plt.title("TSLA Test-Period Forecast: ARIMA vs LSTM")
    plt.legend()
    plt.grid(alpha=0.3)
    savefig("04_model_comparison.png")

    # ---------------------------------------------------------- Task 3 ----
    print("[3/5] Generating 12-month forward forecast...")
    horizon = 252  # ~12 months of trading days
    full_train = tsla_close  # refit on ALL available history for the true future forecast
    final_arima = models.fit_arima(full_train)
    future_fc, future_ci = models.forecast_arima(final_arima, horizon)
    future_dates = pd.bdate_range(tsla_close.index[-1] + pd.Timedelta(days=1), periods=horizon)

    ci_width_start = float(future_ci[0][1] - future_ci[0][0])
    ci_width_end = float(future_ci[-1][1] - future_ci[-1][0])

    results["task3_forecast"] = {
        "horizon_days": horizon,
        "last_actual_price": float(tsla_close.iloc[-1]),
        "forecast_end_price": float(future_fc[-1]),
        "expected_change_pct": float((future_fc[-1] / tsla_close.iloc[-1] - 1) * 100),
        "ci_width_start_pct_of_price": ci_width_start / future_fc[0] * 100,
        "ci_width_end_pct_of_price": ci_width_end / future_fc[-1] * 100,
        "ci_widening_factor": ci_width_end / ci_width_start,
        "forecast_series": [
            {"date": d.strftime("%Y-%m-%d"), "forecast": float(f),
             "lower": float(c[0]), "upper": float(c[1])}
            for d, f, c in zip(future_dates, future_fc, future_ci)
        ][::5],  # thin for frontend payload size
    }

    plt.figure(figsize=(11, 5))
    hist_tail = tsla_close.iloc[-250:]
    plt.plot(hist_tail.index, hist_tail.values, color="#d8dee9", label="Historical", linewidth=1.3)
    plt.plot(future_dates, future_fc, color="#e0b04c", label="12M Forecast", linewidth=1.4)
    plt.fill_between(future_dates, future_ci[:, 0], future_ci[:, 1], color=COLORS["ci"], label="95% CI")
    plt.title("TSLA 12-Month Forecast with Confidence Interval")
    plt.legend()
    plt.grid(alpha=0.3)
    savefig("05_future_forecast.png")

    tsla_forecast_annual_return = float((future_fc[-1] / tsla_close.iloc[-1]) - 1) * (252 / horizon)

    # ---------------------------------------------------------- Task 4 ----
    print("[4/5] Running MPT optimization & efficient frontier...")
    hist_returns = pd.DataFrame({t: clean[t]["Daily Return"] for t in clean}).dropna()
    cov = po.annualized_cov_matrix(hist_returns)
    mu = po.expected_returns_vector(tsla_forecast_annual_return, hist_returns)

    rand_results, rand_weights = po.random_portfolios(mu, cov, n=15000)
    opt = po.optimize_mpt(mu, cov)

    results["task4_portfolio"] = {
        "expected_returns_annual_pct": {k: float(v * 100) for k, v in mu.items()},
        "covariance_matrix_annual": cov.round(6).to_dict(),
        "max_sharpe_portfolio": opt["max_sharpe"],
        "min_volatility_portfolio": opt["min_volatility"],
        "efficient_frontier_sample": [
            {"return": float(r), "volatility": float(v), "sharpe": float(s)}
            for r, v, s in rand_results[::40]
        ],
    }

    plt.figure(figsize=(9, 6.5))
    sc = plt.scatter(rand_results[:, 1] * 100, rand_results[:, 0] * 100,
                      c=rand_results[:, 2], cmap="cividis", s=6, alpha=0.5)
    plt.colorbar(sc, label="Sharpe Ratio")
    ms = opt["max_sharpe"]
    mv = opt["min_volatility"]
    plt.scatter(ms["volatility"] * 100, ms["return"] * 100, color="#e0b04c",
                marker="*", s=350, edgecolor="white", label="Max Sharpe", zorder=5)
    plt.scatter(mv["volatility"] * 100, mv["return"] * 100, color="#3fb8af",
                marker="*", s=350, edgecolor="white", label="Min Volatility", zorder=5)
    plt.xlabel("Volatility (Annualized %)")
    plt.ylabel("Expected Return (Annualized %)")
    plt.title("Efficient Frontier — TSLA / BND / SPY")
    plt.legend()
    plt.grid(alpha=0.3)
    savefig("06_efficient_frontier.png")

    plt.figure(figsize=(6, 5))
    im = plt.imshow(cov.values, cmap="cividis")
    plt.xticks(range(3), cov.columns)
    plt.yticks(range(3), cov.columns)
    for i in range(3):
        for j in range(3):
            plt.text(j, i, f"{cov.values[i,j]:.4f}", ha="center", va="center", color="white", fontsize=9)
    plt.colorbar(im)
    plt.title("Annualized Covariance Matrix")
    savefig("07_covariance_heatmap.png")

    # ---------------------------------------------------------- Task 5 ----
    print("[5/5] Backtesting recommended portfolio vs 60/40 benchmark...")
    recommended_weights = opt["max_sharpe"]["weights"]
    backtest_returns = hist_returns[hist_returns.index >= BACKTEST_START]

    strat_growth = bt.simulate_monthly_rebalance(backtest_returns, recommended_weights)
    benchmark_weights = {"TSLA": 0.0, "BND": 0.4, "SPY": 0.6}
    bench_growth = bt.simulate_monthly_rebalance(backtest_returns, benchmark_weights)

    strat_perf = bt.performance_summary(strat_growth)
    bench_perf = bt.performance_summary(bench_growth)

    results["task5_backtest"] = {
        "backtest_start": BACKTEST_START,
        "recommended_weights": recommended_weights,
        "benchmark_weights": benchmark_weights,
        "strategy_performance": strat_perf,
        "benchmark_performance": bench_perf,
        "outperformed_benchmark": strat_perf["total_return_pct"] > bench_perf["total_return_pct"],
        "cumulative_series": [
            {"date": d.strftime("%Y-%m-%d"), "strategy": float(s), "benchmark": float(b)}
            for d, s, b in zip(backtest_returns.index, strat_growth.values, bench_growth.values)
        ][::3],
    }

    plt.figure(figsize=(11, 5))
    plt.plot(strat_growth.index, strat_growth.values, color=COLORS["forecast"], label="Recommended Strategy", linewidth=1.5)
    plt.plot(bench_growth.index, bench_growth.values, color=COLORS["benchmark"], label="60/40 SPY/BND Benchmark", linewidth=1.5)
    plt.title("Backtest: Cumulative Growth of $1")
    plt.legend()
    plt.grid(alpha=0.3)
    savefig("08_backtest_comparison.png")

    # -------------------------------------------------------- Write out ----
    results["meta"] = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "period": {"start": START, "end": END},
        "note": ("Data source: yfinance where internet access to Yahoo Finance "
                 "is available; falls back to a calibrated synthetic generator "
                 "otherwise (see src/data_loader.py)."),
    }

    with open(os.path.join(RESULTS_DIR, "results.json"), "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("\nDone. Results written to outputs/results/results.json")
    print(f"Best forecasting model: {best_model}")
    print(f"Recommended (Max Sharpe) weights: {recommended_weights}")
    print(f"Strategy outperformed benchmark: {results['task5_backtest']['outperformed_benchmark']}")


if __name__ == "__main__":
    main()
