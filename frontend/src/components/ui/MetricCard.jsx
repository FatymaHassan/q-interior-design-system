import Card from "./Card";

export default function MetricCard({ label, value, icon: Icon, tone = "default", helper = "Live workspace data" }) {
  const tones = {
    default: "text-brand-gold",
    success: "text-green-700",
    danger: "text-brand-danger",
    gold: "text-brand-gold",
  };

  return <Card className="min-h-[112px] p-4 transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p>
      {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-goldSoft"><Icon className={tones[tone] || tones.default} size={18} /></span>}
    </div>
    <b className="mt-2 block text-2xl text-brand-primary">{value}</b>
    <p className="mt-0.5 text-xs font-medium text-brand-muted">{helper}</p>
  </Card>;
}
