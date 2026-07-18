import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import results from "../data/results.json";
import MetricCard from "../components/MetricCard";
import { ChartTooltip } from "./Task1Eda";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Task2Models() {
  const m = results.task2_models;
  const arimaWins = m.best_model === "ARIMA";

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">02 · Forecasting Models</div>
        <h2>ARIMA vs. LSTM on the held-out test year</h2>
        <p className="section-lede">
          Trained on {m.train_size.toLocaleString()} trading days through {m.split_date}, tested
          chronologically on the {m.test_size} days that follow — no shuffling, no leakage.
        </p>
      </div>

      <div className="chart-card card">
        <div className="chart-card-head">
          <h3>Test-period forecast: actual vs. predicted</h3>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={m.test_series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#182740" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#526080" fontSize={11}
                   fontFamily="var(--mono)" interval={20} tickLine={false} axisLine={{ stroke: "#1f3149" }} />
            <YAxis stroke="#526080" fontSize={11} fontFamily="var(--mono)" tickLine={false}
                   axisLine={{ stroke: "#1f3149" }} width={44} unit="$" />
            <Tooltip content={<ChartTooltip fmt={fmtDate} />} />
            <Legend wrapperStyle={{ fontFamily: "var(--mono)", fontSize: 12 }} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#dbe2ee" dot={false} strokeWidth={2.2} />
            <Line type="monotone" dataKey="arima" name="ARIMA" stroke="#e0b04c" dot={false} strokeWidth={1.6} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="lstm" name="LSTM" stroke="#3fb8af" dot={false} strokeWidth={1.6} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="model-compare-grid">
        <div className={`card model-card ${arimaWins ? "model-card-winner" : ""}`}>
          <div className="model-card-head">
            <span className="eyebrow">ARIMA{arimaWins && <span className="winner-tag">winner</span>}</span>
            <span className="mono model-order">order (p,d,q) = ({m.arima.order.join(", ")})</span>
          </div>
          <div className="model-metrics">
            <MetricCard label="MAE" value={`$${m.arima.metrics.MAE.toFixed(2)}`} />
            <MetricCard label="RMSE" value={`$${m.arima.metrics.RMSE.toFixed(2)}`} />
            <MetricCard label="MAPE" value={`${m.arima.metrics.MAPE.toFixed(1)}%`} />
          </div>
        </div>

        <div className={`card model-card ${!arimaWins ? "model-card-winner" : ""}`}>
          <div className="model-card-head">
            <span className="eyebrow">LSTM{!arimaWins && <span className="winner-tag">winner</span>}</span>
            <span className="mono model-order">
              {m.lstm.num_layers} layers · {m.lstm.hidden_size}u · window {m.lstm.window}d · {m.lstm.epochs} epochs
            </span>
          </div>
          <div className="model-metrics">
            <MetricCard label="MAE" value={`$${m.lstm.metrics.MAE.toFixed(2)}`} />
            <MetricCard label="RMSE" value={`$${m.lstm.metrics.RMSE.toFixed(2)}`} />
            <MetricCard label="MAPE" value={`${m.lstm.metrics.MAPE.toFixed(1)}%`} />
          </div>
        </div>
      </div>

      <p className="section-note">
        <strong>{m.best_model}</strong> wins on this test window. For a single trending price series,
        a well-specified statistical baseline is genuinely hard to beat — a realistic, EMH-consistent
        outcome: added model complexity doesn't automatically translate to lower error on daily closes,
        especially once the LSTM's multi-step forecast compounds its own error over the horizon.
      </p>
    </section>
  );
}