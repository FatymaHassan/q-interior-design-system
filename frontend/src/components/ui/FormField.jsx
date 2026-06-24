export const fieldInputClass = "h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm shadow-sm transition placeholder:text-brand-muted/60 hover:border-blue-200";

export default function FormField({ label, children, className = "" }) {
  return <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-black uppercase tracking-wide text-brand-muted">{label}</span>
    {children}
  </label>;
}
