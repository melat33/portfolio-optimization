import results from "../data/results.json";
import MetricCard from "./MetricCard";

export default function Hero() {
  const bt = results.task5_backtest;
  const strat = bt.strategy_performance;
  const bench = bt.benchmark_performance;
  const won = bt.outperformed_benchmark;

  return (
    <header className="hero">
      <div className="hero-inner">
        <div className="eyebrow hero-eyebrow">GMF Investments · Quantitative Research Memo</div>
        <h1 className="hero-title">
          A forecast-informed portfolio,<br />
          <em>tested against the market</em>
        </h1>
        <p className="hero-sub">
          Five stages of analysis — data to decision — for a three-asset portfolio spanning
          high-growth equity (TSLA), fixed income (BND), and broad market exposure (SPY).
          ARIMA and LSTM forecasts feed a Modern Portfolio Theory allocation, backtested against
          a static 60/40 benchmark over the trailing year.
        </p>

        <div className="hero-stats">
          <MetricCard
            label="Strategy · 1Y Return"
            value={`${strat.total_return_pct >= 0 ? "+" : ""}${strat.total_return_pct.toFixed(1)}%`}
            accent="var(--gold)"
            sub={`Sharpe ${strat.sharpe_ratio.toFixed(2)}`}
            size="lg"
          />
          <MetricCard
            label="60/40 Benchmark · 1Y Return"
            value={`${bench.total_return_pct >= 0 ? "+" : ""}${bench.total_return_pct.toFixed(1)}%`}
            accent="var(--blue)"
            sub={`Sharpe ${bench.sharpe_ratio.toFixed(2)}`}
            size="lg"
          />
          <MetricCard
            label="Result"
            value={won ? "Outperformed" : "Underperformed"}
            accent={won ? "var(--positive)" : "var(--negative)"}
            sub={`by ${Math.abs(strat.total_return_pct - bench.total_return_pct).toFixed(1)} pts`}
            size="lg"
          />
        </div>
      </div>
    </header>
  );
}