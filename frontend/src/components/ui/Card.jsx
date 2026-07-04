export default function Card({ children, className = "" }) {
  return <div className={`rounded-lg border border-brand-border/80 bg-white shadow-card ${className}`}>{children}</div>;
}
