export default function MetricCard({ label, value, sub, accent = "var(--text)", size = "md" }) {
  return (
    <div className={`metric-card metric-${size}`}>
      <div className="metric-label eyebrow">{label}</div>
      <div className="metric-value mono" style={{ color: accent }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}