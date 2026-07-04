import Card from "./Card";

export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return <Card className={`p-4 md:p-5 ${className}`}>
    {(title || subtitle || action) && <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        {title && <h2 className="text-base font-black text-brand-primary">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm leading-5 text-brand-muted">{subtitle}</p>}
      </div>
      {action}
    </div>}
    {children}
  </Card>;
}
