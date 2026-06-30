import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ActionButton from "../../components/ui/ActionButton";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

import { formatCurrency } from "../../utils/numberFormat";

export const money = (value) => formatCurrency(value);

export function FinanceHeader({ eyebrow = "Finance", title, description, action, backTo, backLabel }) {
  return <Card className="px-5 py-4 md:px-6 md:py-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        {backTo && <Link to={backTo} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-brand-primary">
          <ArrowLeft size={16} />{backLabel || "Back"}
        </Link>}
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black text-brand-primary md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-brand-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  </Card>;
}

export function FinanceMetric({ label, value, hint }) {
  return <Card className="min-h-[104px] p-4">
    <p className="text-xs font-black uppercase tracking-wide text-brand-muted">{label}</p>
    <b className="mt-2 block text-2xl text-brand-primary">{value}</b>
    {hint && <span className="mt-1 block text-xs text-brand-muted">{hint}</span>}
  </Card>;
}

export function FinanceSection({ title, subtitle, action, children, className = "" }) {
  return <Card className={`p-5 md:p-6 ${className}`}>
    {(title || action) && <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        {title && <h2 className="text-lg font-black text-brand-primary">{title}</h2>}
        {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>}
    {children}
  </Card>;
}

export function FinanceNotice({ children, tone = "info" }) {
  const toneClass = tone === "error" ? "bg-red-50 text-brand-danger" : "bg-brand-soft text-brand-primary";
  return <p className={`rounded-xl p-3 text-sm ${toneClass}`}>{children}</p>;
}

export function FinanceFormActions({ cancelTo, cancelLabel = "Cancel", submitLabel, disabled }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    {cancelTo && <Link to={cancelTo}><Button type="button" variant="outline" className="w-full sm:w-auto">{cancelLabel}</Button></Link>}
    <Button disabled={disabled} className="w-full sm:w-auto">{submitLabel}</Button>
  </div>;
}

export function FinanceActionButton({ children, tone = "default", label, ...props }) {
  return <ActionButton tone={tone} title={label} aria-label={label} {...props}>{children}</ActionButton>;
}
