import Card from "./Card";

export default function PageHeader({ eyebrow, title, description, action }) {
  return <Card className="px-5 py-4 md:px-6 md:py-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-black text-brand-primary md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-brand-muted">{description}</p>}
      </div>
      {action}
    </div>
  </Card>;
}
