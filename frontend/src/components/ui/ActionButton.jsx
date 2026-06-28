const tones = {
  default: "text-brand-primary",
  edit: "text-brand-primary",
  approve: "text-emerald-700",
  warning: "text-amber-700",
  delete: "text-brand-danger",
};

export default function ActionButton({ children, className = "", tone = "default", ...props }) {
  return <button
    type="button"
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white shadow-sm transition hover:border-brand-gold hover:bg-brand-soft focus:outline-none focus:ring-4 focus:ring-blue-100 [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:stroke-current [&_svg]:stroke-[2.5] ${tones[tone] || tones.default} ${className}`}
    {...props}
  >
    {children}
  </button>;
}
