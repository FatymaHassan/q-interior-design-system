export default function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-brand-border/80 bg-white shadow-card ${className}`}>{children}</div>;
}
