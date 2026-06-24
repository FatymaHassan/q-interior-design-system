export default function Input({ className = "", ...props }) {
  return <input className={`w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm shadow-sm transition placeholder:text-brand-muted/60 ${className}`} {...props} />;
}
