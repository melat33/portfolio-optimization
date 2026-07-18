import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import results from "../data/results.json";
import MetricCard from "../components/MetricCard";
import { ChartTooltip } from "./Task1Eda";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Task5Backtest() {
  const bt = results.task5_backtest;
  const strat = bt.strategy_performance;
  const bench = bt.benchmark_performance;
  const won = bt.outperformed_benchmark;

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">05 · Strategy Backtesting</div>
        <h2>Did it actually work?</h2>
        <p className="section-lede">
          The recommended Max-Sharpe portfolio, monthly-rebalanced, run over the trailing year — the
          data that was never used for training or optimization — against a static 60% SPY / 40% BND
          benchmark.
        </p>
      </div>

      <div className="chart-card card">
        <div className="chart-card-head">
          <h3>Cumulative growth of $1 <span className="chart-sub">since {bt.backtest_start}</span></h3>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={bt.cumulative_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#182740" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#526080" fontSize={11}
                   fontFamily="var(--mono)" interval={14} tickLine={false} axisLine={{ stroke: "#1f3149" }} />
            <YAxis stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} width={44} tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <Tooltip content={<ChartTooltip fmt={fmtDate} />} />
            <Legend wrapperStyle={{ fontFamily: "var(--mono)", fontSize: 12 }} />
            <ReferenceLine y={1} stroke="#3a4a63" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="strategy" name="Recommended Strategy" stroke="#e0b04c" dot={false} strokeWidth={2.2} />
            <Line type="monotone" dataKey="benchmark" name="60/40 Benchmark" stroke="#5b8def" dot={false} strokeWidth={2.2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="table-card card">
        <table className="data-table">
          <thead>
            <tr><th>Portfolio</th><th>Total Return</th><th>Ann. Return</th><th>Ann. Vol</th><th>Sharpe</th><th>Max Drawdown</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="asset-dot" style={{ background: "#e0b04c" }} />Recommended Strategy</td>
              <td className={`mono ${strat.total_return_pct >= 0 ? "up" : "down"}`}>{strat.total_return_pct >= 0 ? "+" : ""}{strat.total_return_pct.toFixed(1)}%</td>
              <td className="mono">{strat.annualized_return_pct.toFixed(1)}%</td>
              <td className="mono">{strat.annualized_volatility_pct.toFixed(1)}%</td>
              <td className="mono">{strat.sharpe_ratio.toFixed(2)}</td>
              <td className="mono down">{strat.max_drawdown_pct.toFixed(1)}%</td>
            </tr>
            <tr>
              <td><span className="asset-dot" style={{ background: "#5b8def" }} />60/40 Benchmark</td>
              <td className={`mono ${bench.total_return_pct >= 0 ? "up" : "down"}`}>{bench.total_return_pct >= 0 ? "+" : ""}{bench.total_return_pct.toFixed(1)}%</td>
              <td className="mono">{bench.annualized_return_pct.toFixed(1)}%</td>
              <td className="mono">{bench.annualized_volatility_pct.toFixed(1)}%</td>
              <td className="mono">{bench.sharpe_ratio.toFixed(2)}</td>
              <td className="mono down">{bench.max_drawdown_pct.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`verdict-banner ${won ? "verdict-good" : "verdict-bad"}`}>
        <span className="verdict-icon">{won ? "▲" : "▼"}</span>
        <div>
          <strong>{won ? "The strategy outperformed the benchmark." : "The strategy underperformed the benchmark."}</strong>{" "}
          {won
            ? "An encouraging initial signal — with correspondingly higher volatility and drawdown, a reasonable trade-off for a growth-tilted allocation."
            : "The static benchmark held up better over this window."}
        </div>
      </div>

      <p className="section-note">
        <strong>Limitations:</strong> a single one-year window is a small, path-dependent sample;
        transaction costs, slippage, and taxes aren't modeled; the strategy's TSLA weighting is
        conditioned on one forecast snapshot rather than re-estimated through the period; and monthly
        rebalancing assumes frictionless execution. A production deployment would need walk-forward
        re-optimization, cost modeling, and testing across multiple regimes before real capital follows it.
      </p>
    </section>
  );
}