import Card from "./Card";

export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return <Card className={`p-4 md:p-5 ${className}`}>
    {(title || subtitle || action) && <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        {title && <h2 className="font-black text-brand-primary">{title}</h2>}
        {subtitle && <p className="mt-0.5 text-sm text-brand-muted">{subtitle}</p>}
      </div>
      {action}
    </div>}
    {children}
  </Card>;
}
