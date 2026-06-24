export default function LoadingState({ label = "Loading..." }) {
  return <div className="rounded-2xl border border-brand-border bg-white p-5 text-sm text-brand-muted">{label}</div>;
}
