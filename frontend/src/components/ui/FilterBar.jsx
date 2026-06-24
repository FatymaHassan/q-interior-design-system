export default function FilterBar({ children, className = "" }) {
  return <div className={`mb-4 grid grid-cols-1 gap-3 ${className}`}>{children}</div>;
}
