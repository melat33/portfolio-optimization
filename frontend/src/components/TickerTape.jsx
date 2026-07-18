import results from "../data/results.json";

const ASSET_META = {
  TSLA: { color: "var(--gold)", label: "Tesla Inc." },
  BND: { color: "var(--teal)", label: "Vanguard Total Bond Mkt ETF" },
  SPY: { color: "var(--blue)", label: "SPDR S&P 500 ETF" },
};

function TickerItem({ ticker }) {
  const d = results.task1_eda.assets[ticker];
  const meta = ASSET_META[ticker];
  const up = d.annualized_return_pct >= 0;
  return (
    <span className="ticker-item">
      <span className="ticker-symbol" style={{ color: meta.color }}>{ticker}</span>
      <span className="ticker-price mono">${d.end_price.toFixed(2)}</span>
      <span className={`ticker-change mono ${up ? "up" : "down"}`}>
        {up ? "▲" : "▼"} {Math.abs(d.annualized_return_pct).toFixed(1)}% ann.
      </span>
      <span className="ticker-sep">·</span>
      <span className="ticker-label">{meta.label}</span>
      <span className="ticker-gap" />
    </span>
  );
}

export default function TickerTape() {
  const tickers = ["TSLA", "BND", "SPY"];
  const loop = [...tickers, ...tickers, ...tickers, ...tickers];
  return (
    <div className="ticker-tape">
      <div className="ticker-track">
        {loop.map((t, i) => <TickerItem key={i} ticker={t} />)}
      </div>
    </div>
  );
}