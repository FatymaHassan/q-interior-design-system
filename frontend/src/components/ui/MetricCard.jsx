import Card from "./Card";

export default function MetricCard({ label, value, icon: Icon, tone = "default", helper = "Live workspace data" }) {
  const tones = {
    default: "bg-brand-goldSoft text-brand-gold",
    success: "bg-emerald-50 text-green-700",
    danger: "bg-red-50 text-brand-danger",
    warning: "bg-amber-50 text-brand-warning",
    gold: "bg-brand-goldSoft text-brand-gold",
  };

  return <Card className="min-h-[112px] p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p>
      {Icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.default}`}><Icon size={18} /></span>}
    </div>
    <b className="mt-3 block truncate text-2xl text-brand-primary">{value}</b>
    {helper && <p className="mt-1 text-xs font-medium leading-5 text-brand-muted">{helper}</p>}
  </Card>;
}
