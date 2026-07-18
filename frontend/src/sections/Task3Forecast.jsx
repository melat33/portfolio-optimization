import {
  ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import results from "../data/results.json";
import MetricCard from "../components/MetricCard";
import { ChartTooltip } from "./Task1Eda";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function Task3Forecast() {
  const f = results.task3_forecast;
  const up = f.expected_change_pct >= 0;

  const chartData = f.forecast_series.map((d) => ({
    ...d, band: [d.lower, d.upper],
  }));

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">03 · 12-Month Forecast</div>
        <h2>How far can this forecast be trusted?</h2>
        <p className="section-lede">
          Projecting the best-performing model {f.horizon_days} trading days forward, with a 95%
          confidence band that widens with every step — the honest shape of long-horizon uncertainty.
        </p>
      </div>

      <div className="hero-stats" style={{ marginBottom: 28 }}>
        <MetricCard label="Last Actual (TSLA)" value={`$${f.last_actual_price.toFixed(2)}`} />
        <MetricCard label="12M Forecast" value={`$${f.forecast_end_price.toFixed(2)}`}
                    accent={up ? "var(--positive)" : "var(--negative)"} />
        <MetricCard label="Expected Change" value={`${up ? "+" : ""}${f.expected_change_pct.toFixed(1)}%`}
                    accent={up ? "var(--positive)" : "var(--negative)"} />
        <MetricCard label="CI Widening" value={`${f.ci_widening_factor.toFixed(1)}×`}
                    sub="day 1 → day 252" accent="var(--gold)" />
      </div>

      <div className="chart-card card">
        <div className="chart-card-head">
          <h3>Forecast with 95% confidence interval</h3>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#182740" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#526080" fontSize={11}
                   fontFamily="var(--mono)" interval={9} tickLine={false} axisLine={{ stroke: "#1f3149" }} />
            <YAxis stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} width={44} unit="$" />
            <Tooltip content={<ChartTooltip fmt={fmtDate} />} />
            <Legend wrapperStyle={{ fontFamily: "var(--mono)", fontSize: 12 }} />
            <Area type="monotone" dataKey="band" name="95% CI" stroke="none" fill="#e0b04c" fillOpacity={0.18} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#e0b04c" dot={false} strokeWidth={2.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="section-note">
        The confidence band widens roughly <strong>{f.ci_widening_factor.toFixed(0)}×</strong> from
        the first forecast step to the twelve-month mark — the expected signature of a random-walk-like
        differenced ARIMA process, where forecast error variance grows with the horizon. Near-term
        (1–4 week) forecasts are meaningfully tighter and more actionable; the 9–12 month tail should be
        read as a wide plausible range, not a point estimate, and treated as one input into a diversified
        strategy rather than a standalone signal.
      </p>
    </section>
  );
}