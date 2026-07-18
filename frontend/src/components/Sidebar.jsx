import { Database, Activity, TrendingUp, PieChart, BarChart3 } from "lucide-react";
import results from "../data/results.json";

const TABS = [
  { id: "eda", label: "Data & EDA", icon: Database },
  { id: "models",  label: "Forecasting Models", icon: Activity },
  { id: "forecast",  label: "12M Forecast", icon: TrendingUp },
  { id: "portfolio",  label: "Portfolio Optimization", icon: PieChart },
  { id: "backtest",  label: "Backtest", icon: BarChart3 },
];

export default function Sidebar({ active, onChange }) {
  const bt = results.task5_backtest;
  const won = bt.outperformed_benchmark;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <svg width="30" height="30" viewBox="0 0 32 32" className="brand-mark">
          <rect width="32" height="32" rx="4" fill="#0e1a2b" stroke="#1f3149" />
          <path d="M6 22 L12 14 L17 18 L26 7" stroke="#e0b04c" strokeWidth="2.2" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26" cy="7" r="2" fill="#e0b04c" />
        </svg>
        <div>
          <div className="brand-name">GMF</div>
          <div className="brand-sub eyebrow">Investments</div>
        </div>
      </div>

      <div className="sidebar-title eyebrow">Portfolio Forecasting Terminal</div>

      <nav className="sidebar-nav">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => onChange(t.id)}
            >
              <span className="sidebar-item-bar" />
              <Icon size={16} strokeWidth={1.75} className="sidebar-item-icon" />
              <span className="sidebar-item-text">
                <span className="sidebar-item-n mono">{t.n}</span>
                <span className="sidebar-item-label">{t.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Backtest Verdict</div>
        <div className={`sidebar-verdict ${won ? "good" : "bad"}`}>
          <span className="sidebar-verdict-icon">{won ? "▲" : "▼"}</span>
          <div>
            <div className="mono sidebar-verdict-value">
              {won ? "+" : ""}{(bt.strategy_performance.total_return_pct - bt.benchmark_performance.total_return_pct).toFixed(1)} pts
            </div>
            <div className="sidebar-verdict-label">vs. 60/40 benchmark</div>
          </div>
        </div>
      </div>
    </aside>
  );
}