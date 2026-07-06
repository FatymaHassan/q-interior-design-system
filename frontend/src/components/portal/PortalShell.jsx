import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import Button from "../ui/Button";

export function PortalShell({ title, subtitle, userName, navItems, active, onNavigate, onLogout, children, notificationCount = 0 }) {
  const activeLabel = navItems.find((item) => item.key === active)?.label || active;

  return <main className="min-h-screen bg-[#F4F6F8] text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-[1500px]">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white px-4 py-5 lg:block">
        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-950">QI</span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Q Interior</p>
              <h1 className="truncate text-lg font-black">{title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-300">{subtitle}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const selected = active === key;
            return <button key={key} type="button" onClick={() => onNavigate(key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${selected ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
              <Icon size={17} />
              <span className="font-bold">{label}</span>
            </button>;
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Signed in as</p>
          <p className="mt-1 truncate text-sm font-black text-slate-950">{userName || "Portal user"}</p>
        </div>
      </aside>

      <section className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#F4F6F8]/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"><Menu size={18} /></span>
              <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 lg:hidden">{title}</p>
                <h2 className="truncate text-lg font-black text-slate-950 md:text-xl">{activeLabel}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="Notifications">
                <Bell size={17} />
                {notificationCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />}
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 text-xs font-black text-cyan-700">{userName?.slice(0, 1) || "U"}</span>
                <span className="max-w-36 truncate text-sm font-bold text-slate-800">{userName || "Portal user"}</span>
                <ChevronDown size={15} className="text-slate-400" />
              </div>
              <Button variant="outline" className="gap-2 px-3" onClick={onLogout}><LogOut size={16} /><span className="hidden sm:inline">Logout</span></Button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 md:px-6 xl:px-8">{children}</div>
      </section>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto">
        {navItems.map(({ key, label, icon: Icon }) => {
          const selected = active === key;
          return <button key={key} type="button" onClick={() => onNavigate(key)} className={`flex min-h-14 min-w-[76px] flex-col items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-black transition ${selected ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
            <Icon size={17} />
            <span className="max-w-full truncate">{label}</span>
          </button>;
        })}
      </div>
    </nav>
  </main>;
}

export function PortalCard({ children, className = "" }) {
  return <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)] ${className}`}>{children}</section>;
}

export function PortalStatCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return <PortalCard className="p-4">
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.blue}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
        {helper && <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{helper}</p>}
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
    "On Leave": "bg-blue-50 text-blue-700 ring-blue-100",
    Pending: "bg-amber-50 text-amber-700 ring-amber-100",
    Approved: "bg-green-50 text-green-700 ring-green-100",
    Paid: "bg-green-50 text-green-700 ring-green-100",
    Rejected: "bg-red-50 text-red-700 ring-red-100",
    Unpaid: "bg-red-50 text-red-700 ring-red-100",
    Sent: "bg-blue-50 text-blue-700 ring-blue-100",
    Active: "bg-green-50 text-green-700 ring-green-100",
    Completed: "bg-green-50 text-green-700 ring-green-100",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${colors[children] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>{children || "-"}</span>;
}

export function PortalSectionHeader({ title, subtitle, action }) {
  return <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>;
}

export function PortalEmptyState({ title, description }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
    <p className="font-black text-slate-800">{title}</p>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
  </div>;
}

export function PortalSkeleton() {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />)}
  </div>;
}
