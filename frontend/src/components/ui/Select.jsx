export default function Select({ children, className = "", ...props }) {
  return <select className={`w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm shadow-sm transition ${className}`} {...props}>{children}</select>;
}
