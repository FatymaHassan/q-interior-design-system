export default function PageHeader({ eyebrow, title, description, action }) {
  return <div className="rounded-lg border border-brand-border/70 bg-white/82 px-5 py-4 shadow-sm backdrop-blur md:px-6 md:py-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-black leading-tight text-brand-primary md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </div>;
}
