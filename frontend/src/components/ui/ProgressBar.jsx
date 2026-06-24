export default function ProgressBar({ value = 0 }) {
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), 100);

  return <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-soft">
    <div className="h-full rounded-full bg-brand-primary transition-all duration-500" style={{ width: `${safeValue}%` }} />
  </div>;
}
