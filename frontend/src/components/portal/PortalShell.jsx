import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import Button from "../ui/Button";

export function PortalShell({ title, subtitle, userName, navItems, active, onNavigate, onLogout, children, notificationCount = 0 }) {
  const activeLabel = navItems.find((item) => item.key === active)?.label || active;

  return <main className="min-h-screen bg-brand-bg text-brand-text">
    <div className="mx-auto flex min-h-screen max-w-[1500px]">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 bg-brand-primaryDark px-4 py-5 text-brand-bg shadow-2xl lg:block">
        <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-sm font-black text-brand-gold shadow-sm">QI</span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight text-white">{title}</h1>
              <p className="mt-1 text-xs font-medium text-white/45">{subtitle}</p>
            </div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-soft">
          {navItems.map(({ key, label, icon: Icon }) => {
            const selected = active === key;
            return <button key={key} type="button" onClick={() => onNavigate(key)} className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${selected ? "bg-white/17 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/62 hover:bg-white/8 hover:text-white"}`}>
              <span className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition ${selected ? "bg-brand-gold" : "bg-transparent"}`} />
              <Icon size={17} className={`shrink-0 transition ${selected ? "text-brand-gold" : "text-white/42 group-hover:text-white/72"}`} />
              <span className={`truncate ${selected ? "font-semibold" : "font-medium"}`}>{label}</span>
            </button>;
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-5 rounded-lg border border-white/10 bg-white/10 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/42">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{userName || "Portal user"}</p>
        </div>
      </aside>

      <section className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-brand-border/80 bg-brand-bg/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-primary shadow-sm lg:hidden"><Menu size={18} /></span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-gold lg:hidden">{title}</p>
                <h2 className="truncate text-lg font-black text-brand-primary md:text-xl">{activeLabel}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-primary shadow-sm transition hover:bg-brand-soft" aria-label="Notifications">
                <Bell size={17} />
                {notificationCount > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-danger ring-2 ring-white" />}
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 shadow-sm sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-xs font-black text-white">{userName?.slice(0, 1) || "U"}</span>
                <span className="max-w-36 truncate text-sm font-bold text-brand-primary">{userName || "Portal user"}</span>
                <ChevronDown size={15} className="text-brand-muted" />
              </div>
              <Button variant="outline" className="gap-2 px-3" onClick={onLogout}><LogOut size={16} /><span className="hidden sm:inline">Logout</span></Button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 md:px-6 xl:px-8">{children}</div>
      </section>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-brand-primaryDark/95 px-2 py-2 shadow-[0_-12px_30px_rgba(31,26,23,0.18)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto">
        {navItems.map(({ key, label, icon: Icon }) => {
          const selected = active === key;
          return <button key={key} type="button" onClick={() => onNavigate(key)} className={`flex min-h-14 min-w-[76px] flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] transition ${selected ? "bg-white/17 text-white" : "text-white/55 hover:bg-white/8 hover:text-white"}`}>
            <Icon size={17} className={selected ? "text-brand-gold" : ""} />
            <span className="max-w-full truncate">{label}</span>
          </button>;
        })}
      </div>
    </nav>
  </main>;
}

export function PortalCard({ children, className = "" }) {
  return <section className={`rounded-lg border border-brand-border/80 bg-white shadow-card ${className}`}>{children}</section>;
}

export function PortalStatCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "bg-brand-goldSoft text-brand-primary",
    green: "bg-emerald-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-brand-danger",
    slate: "bg-brand-soft text-brand-primary",
  };
  return <PortalCard className="p-4">
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.blue}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-brand-muted">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-brand-primary">{value}</p>
        {helper && <p className="mt-0.5 truncate text-xs font-semibold text-brand-muted">{helper}</p>}
      </div>
    </div>
  </PortalCard>;
}

export function PortalStatusBadge({ children }) {
  const colors = {
    Present: "bg-green-50 text-green-700 ring-green-100",
    Late: "bg-amber-50 text-amber-700 ring-amber-100",
    "Early Out": "bg-orange-50 text-orange-700 ring-orange-100",
    "Late / Early Out": "bg-orange-50 text-orange-800 ring-orange-100",
    Absent: "bg-red-50 text-red-700 ring-red-100",
    "On Leave": "bg-brand-goldSoft text-brand-primary ring-brand-border",
    Pending: "bg-amber-50 text-amber-700 ring-amber-100",
    Approved: "bg-green-50 text-green-700 ring-green-100",
    Paid: "bg-green-50 text-green-700 ring-green-100",
    Rejected: "bg-red-50 text-red-700 ring-red-100",
    Unpaid: "bg-red-50 text-red-700 ring-red-100",
    Sent: "bg-brand-goldSoft text-brand-primary ring-brand-border",
    Active: "bg-green-50 text-green-700 ring-green-100",
    Completed: "bg-green-50 text-green-700 ring-green-100",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${colors[children] || "bg-brand-soft text-brand-primary ring-brand-border"}`}>{children || "-"}</span>;
}

export function PortalSectionHeader({ title, subtitle, action }) {
  return <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-base font-black text-brand-primary">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-brand-muted">{subtitle}</p>}
    </div>
    {action}
  </div>;
}

export function PortalEmptyState({ title, description }) {
  return <div className="rounded-lg border border-dashed border-brand-border bg-brand-soft/60 p-5 text-center">
    <p className="font-black text-brand-primary">{title}</p>
    {description && <p className="mt-1 text-sm text-brand-muted">{description}</p>}
  </div>;
}

export function PortalSkeleton() {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg border border-brand-border bg-white" />)}
  </div>;
}
