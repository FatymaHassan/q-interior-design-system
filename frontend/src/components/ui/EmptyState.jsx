export default function EmptyState({ title = "No data yet", description = "Create a record to get started.", action }) {
  return <div className="rounded-lg border border-dashed border-brand-border bg-white p-8 text-center shadow-sm">
    <h3 className="font-bold text-brand-text">{title}</h3>
    <p className="mt-2 text-sm text-brand-muted">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
