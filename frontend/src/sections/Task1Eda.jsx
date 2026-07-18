import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, AreaChart, Area, Legend,
} from "recharts";
import results from "../data/results.json";
import MetricCard from "../components/MetricCard";

const COLORS = { TSLA: "var(--gold)", BND: "var(--teal)", SPY: "var(--blue)" };
const HEX = { TSLA: "#e0b04c", BND: "#3fb8af", SPY: "#5b8def" };

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function AssetRow({ ticker }) {
  const a = results.task1_eda.assets[ticker];
  return (
    <tr>
      <td><span className="asset-dot" style={{ background: HEX[ticker] }} />{ticker}</td>
      <td className="mono">${a.end_price.toFixed(2)}</td>
      <td className={`mono ${a.annualized_return_pct >= 0 ? "up" : "down"}`}>
        {a.annualized_return_pct >= 0 ? "+" : ""}{a.annualized_return_pct.toFixed(1)}%
      </td>
      <td className="mono">{a.annualized_volatility_pct.toFixed(1)}%</td>
      <td className="mono">{a.sharpe_ratio.toFixed(2)}</td>
      <td className="mono">{a.var_95_daily_pct.toFixed(2)}%</td>
      <td className="mono">{a.n_outlier_days}</td>
      <td className="mono">
        {a.adf_returns.is_stationary
          ? <span className="tag tag-good">stationary</span>
          : <span className="tag tag-bad">non-stationary</span>}
      </td>
    </tr>
  );
}

export default function Task1Eda() {
  const { price_series, return_histogram, rolling_vol_series } = results.task1_eda;

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">01 · Preprocess &amp; Explore</div>
        <h2>Three assets, three risk profiles</h2>
        <p className="section-lede">
          Eleven years of daily OHLCV data, cleaned to a continuous business-day index with no
          gaps, then tested for stationarity and characterized by volatility and tail risk before
          any model gets near it.
        </p>
      </div>

      <div className="chart-card card">
        <div className="chart-card-head">
          <h3>Normalized price growth <span className="chart-sub">(base = 100, monthly)</span></h3>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={price_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#182740" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#526080" fontSize={11}
                   fontFamily="var(--mono)" interval={11} tickLine={false} axisLine={{ stroke: "#1f3149" }} />
            <YAxis stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} width={44} />
            <Tooltip content={<ChartTooltip fmt={fmtDate} />} />
            <Legend wrapperStyle={{ fontFamily: "var(--mono)", fontSize: 12 }} />
            <Line type="monotone" dataKey="TSLA" stroke={HEX.TSLA} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="BND" stroke={HEX.BND} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="SPY" stroke={HEX.SPY} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="chart-card card">
          <div className="chart-card-head">
            <h3>TSLA 30-day rolling volatility</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={rolling_vol_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={HEX.TSLA} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={HEX.TSLA} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#182740" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#526080" fontSize={10}
                     fontFamily="var(--mono)" interval={40} tickLine={false} axisLine={{ stroke: "#1f3149" }} />
              <YAxis stroke="#526080" fontSize={10} fontFamily="var(--mono)" tickLine={false}
                     axisLine={{ stroke: "#1f3149" }} width={36} unit="%" />
              <Tooltip content={<ChartTooltip fmt={fmtDate} />} />
              <Area type="monotone" dataKey="vol" stroke={HEX.TSLA} fill="url(#volGrad)" strokeWidth={1.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <div className="chart-card-head">
            <h3>TSLA daily return distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={return_histogram} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#182740" vertical={false} />
              <XAxis dataKey="bin" tickFormatter={(v) => v.toFixed(0) + "%"} stroke="#526080"
                     fontSize={10} fontFamily="var(--mono)" tickLine={false} axisLine={{ stroke: "#1f3149" }} />
              <YAxis stroke="#526080" fontSize={10} fontFamily="var(--mono)" tickLine={false}
                     axisLine={{ stroke: "#1f3149" }} width={30} />
              <Tooltip content={<ChartTooltip labelFmt={(v) => `${Number(v).toFixed(1)}% return`} />} />
              <Bar dataKey="count" fill={HEX.TSLA} opacity={0.85} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-card card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th><th>Price</th><th>Ann. Return</th><th>Ann. Vol</th>
              <th>Sharpe</th><th>VaR 95%</th><th>Outliers</th><th>Returns ADF</th>
            </tr>
          </thead>
          <tbody>
            <AssetRow ticker="TSLA" />
            <AssetRow ticker="BND" />
            <AssetRow ticker="SPY" />
          </tbody>
        </table>
      </div>

      <p className="section-note">
        Price levels fail the ADF test (non-stationary, as expected for a trending series) while
        daily returns pass comfortably — confirming <span className="mono">d=1</span> differencing
        is the right starting point for ARIMA, consistent with the Efficient Market Hypothesis view
        that price <em>levels</em> carry a unit root while <em>returns</em> fluctuate around a stable mean.
      </p>
    </section>
  );
}

export function ChartTooltip({ active, payload, label, fmt, labelFmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label mono">
        {labelFmt ? labelFmt(label) : fmt ? fmt(label) : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row mono">
          <span style={{ color: p.color || p.stroke || p.fill }}>{p.name}</span>
          <span>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}