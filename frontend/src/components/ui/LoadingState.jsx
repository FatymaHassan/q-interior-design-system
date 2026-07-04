export default function LoadingState({ label = "Loading..." }) {
  return <div className="rounded-lg border border-brand-border bg-white p-5 text-sm text-brand-muted shadow-sm">
    <div className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-gold" />
      <span>{label}</span>
    </div>
  </div>;
}
