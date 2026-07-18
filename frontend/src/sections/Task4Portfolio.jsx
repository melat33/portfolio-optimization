import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  BarChart, Bar, Legend,
} from "recharts";
import results from "../data/results.json";
import MetricCard from "../components/MetricCard";

const HEX = { TSLA: "#e0b04c", BND: "#3fb8af", SPY: "#5b8def" };

function sharpeColor(s, min, max) {
  const t = Math.max(0, Math.min(1, (s - min) / (max - min || 1)));
  const stops = [
    [63, 90, 155],
    [63, 184, 175],
    [224, 176, 76],
  ];
  const seg = t < 0.5 ? 0 : 1;
  const localT = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const [r1, g1, b1] = stops[seg];
  const [r2, g2, b2] = stops[seg + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r},${g},${b})`;
}

function WeightBar({ label, weights, accent }) {
  const order = ["TSLA", "BND", "SPY"];
  return (
    <div className="weight-bar-row">
      <div className="weight-bar-label">
        <span className="mono" style={{ color: accent }}>{label}</span>
      </div>
      <div className="weight-bar-track">
        {order.map((t) => {
          const w = (weights[t] || 0) * 100;
          if (w < 0.5) return null;
          return (
            <div key={t} className="weight-bar-seg" style={{ width: `${w}%`, background: HEX[t] }}
                 title={`${t}: ${w.toFixed(1)}%`}>
              {w > 8 && <span className="weight-bar-seg-label mono">{t} {w.toFixed(0)}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Task4Portfolio() {
  const p = results.task4_portfolio;
  const points = p.efficient_frontier_sample;
  const sharpes = points.map((d) => d.sharpe);
  const min = Math.min(...sharpes), max = Math.max(...sharpes);

  const ms = p.max_sharpe_portfolio;
  const mv = p.min_volatility_portfolio;

  const cov = p.covariance_matrix_annual;
  const assets = ["TSLA", "BND", "SPY"];

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">04 · Portfolio Optimization</div>
        <h2>Modern Portfolio Theory, applied</h2>
        <p className="section-lede">
          TSLA's expected return comes from the Task 3 forecast; BND and SPY use their historical
          annualized averages — a common analyst pattern: a specific view on one asset, historical
          priors on the rest.
        </p>
      </div>

      <div className="hero-stats" style={{ marginBottom: 28 }}>
        <MetricCard label="TSLA Expected Return" value={`${p.expected_returns_annual_pct.TSLA.toFixed(1)}%`} accent={HEX.TSLA} />
        <MetricCard label="BND Expected Return" value={`${p.expected_returns_annual_pct.BND.toFixed(1)}%`} accent={HEX.BND} />
        <MetricCard label="SPY Expected Return" value={`${p.expected_returns_annual_pct.SPY.toFixed(1)}%`} accent={HEX.SPY} />
      </div>

      <div className="chart-card card">
        <div className="chart-card-head">
          <h3>Efficient frontier <span className="chart-sub">15,000 simulated portfolios</span></h3>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#182740" />
            <XAxis type="number" dataKey="volatility" name="Volatility" unit="" tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
                   stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} label={{ value: "Volatility (annualized)", position: "insideBottom", offset: -5, fill: "#8b9ab3", fontSize: 11 }} />
            <YAxis type="number" dataKey="return" name="Return" tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
                   stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} width={50}
                   label={{ value: "Expected Return", angle: -90, position: "insideLeft", fill: "#8b9ab3", fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<FrontierTooltip />} />
            <Scatter data={points} shape="circle">
              {points.map((d, i) => <Cell key={i} fill={sharpeColor(d.sharpe, min, max)} fillOpacity={0.55} r={2.5} />)}
            </Scatter>
            <Scatter data={[{ volatility: ms.volatility, return: ms.return, name: "Max Sharpe" }]} fill="#e0b04c" shape="star" />
            <Scatter data={[{ volatility: mv.volatility, return: mv.return, name: "Min Volatility" }]} fill="#3fb8af" shape="star" />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="frontier-legend">
          <span><i style={{ background: "#e0b04c" }} /> Max Sharpe (tangency)</span>
          <span><i style={{ background: "#3fb8af" }} /> Min Volatility</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card weight-card">
          <div className="chart-card-head"><h3>Recommended allocations</h3></div>
          <WeightBar label="Max Sharpe" weights={ms.weights} accent="var(--gold)" />
          <div style={{ height: 14 }} />
          <WeightBar label="Min Volatility" weights={mv.weights} accent="var(--teal)" />
          <div className="portfolio-stat-row">
            <div><span className="eyebrow">Max Sharpe</span>
              <div className="mono">Return {(ms.return * 100).toFixed(1)}% · Vol {(ms.volatility * 100).toFixed(1)}% · Sharpe {ms.sharpe.toFixed(2)}</div>
            </div>
            <div><span className="eyebrow">Min Volatility</span>
              <div className="mono">Return {(mv.return * 100).toFixed(1)}% · Vol {(mv.volatility * 100).toFixed(1)}% · Sharpe {mv.sharpe.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="chart-card-head"><h3>Annualized covariance matrix</h3></div>
          <table className="cov-table">
            <thead><tr><th /><th>TSLA</th><th>BND</th><th>SPY</th></tr></thead>
            <tbody>
              {assets.map((r) => (
                <tr key={r}>
                  <th>{r}</th>
                  {assets.map((c) => (
                    <td key={c} className="mono">{cov[r][c].toFixed(4)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="section-note">
        We recommend the <strong>Max Sharpe portfolio</strong> for a growth-oriented client — it
        maximizes risk-adjusted return, the standard MPT criterion absent a specific risk budget.
        The Min-Volatility portfolio is the conservative alternative. Because TSLA's expected return
        is forecast-conditional (Task 3), this allocation should be re-run whenever that view changes.
      </p>
    </section>
  );
}

function FrontierTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-row mono"><span>Return</span><span>{(d.return * 100).toFixed(2)}%</span></div>
      <div className="chart-tooltip-row mono"><span>Volatility</span><span>{(d.volatility * 100).toFixed(2)}%</span></div>
      {d.sharpe !== undefined && (
        <div className="chart-tooltip-row mono"><span>Sharpe</span><span>{d.sharpe.toFixed(2)}</span></div>
      )}
    </div>
  );
}