const TABS = [
  { id: "eda", n: "01", label: "Data & EDA" },
  { id: "models", n: "02", label: "Forecasting Models" },
  { id: "forecast", n: "03", label: "12M Forecast" },
  { id: "portfolio", n: "04", label: "Portfolio Optimization" },
  { id: "backtest", n: "05", label: "Backtest" },
];

export default function NavTabs({ active, onChange }) {
  return (
    <nav className="nav-tabs">
      <div className="nav-tabs-inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab ${active === t.id ? "active" : ""}`}
            onClick={() => onChange(t.id)}
          >
            <span className="nav-tab-n mono">{t.n}</span>
            <span className="nav-tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
