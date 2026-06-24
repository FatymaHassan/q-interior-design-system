import { NavLink } from "react-router-dom";
import { Bell, Boxes, Briefcase, CalendarDays, CheckSquare, ClipboardList, Clock, Columns3, FileText, Image, Inbox, LayoutDashboard, Lock, Plane, Receipt, ScrollText, Settings, Sparkles, Tags, UserRoundCog, Users, Wallet, X } from "lucide-react";
import { userHasRole } from "../../services/api";

const sections = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
      { label: "Clients", icon: Users, to: "/clients" },
    ],
  },
  {
    label: "Project & Daily Work",
    items: [
      { label: "Projects", icon: Briefcase, to: "/projects" },
      { label: "Project Board", icon: Columns3, to: "/project-board" },
      { label: "Daily Tasks", icon: CheckSquare, to: "/daily-tasks" },
      { label: "Team Members", icon: UserRoundCog, to: "/team-members", roles: ["admin", "manager"] },
      { label: "Photos", icon: Image, to: "/photos" },
      { label: "Documents", icon: FileText, to: "/documents" },
      { label: "Client Messages", icon: Inbox, to: "/client-messages" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Finance Overview", icon: Wallet, to: "/finance", roles: ["admin", "manager", "finance"] },
      { label: "Invoices", icon: ScrollText, to: "/invoices", roles: ["admin", "manager", "finance"] },
      { label: "Expenses", icon: Receipt, to: "/expenses", roles: ["admin", "manager", "finance"] },
      { label: "Expense Categories", icon: Tags, to: "/expense-categories", roles: ["admin", "manager", "finance"] },
      { label: "Payments", icon: Wallet, to: "/payments", roles: ["admin", "manager", "finance"] },
      { label: "Overheads", icon: FileText, to: "/overheads", roles: ["admin", "manager", "finance"] },
      { label: "Quotations", icon: ScrollText, to: "/quotations", roles: ["admin", "manager", "designer"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", icon: Boxes, to: "/inventory", roles: ["admin", "manager", "finance", "staff"] },
      { label: "Reports", icon: ClipboardList, to: "/reports", roles: ["admin", "manager", "finance"] },
    ],
  },
  {
    label: "HR Management",
    items: [
      { label: "HR Dashboard", icon: UserRoundCog, to: "/hr", roles: ["admin", "manager", "hr"] },
      { label: "Employee Directory", icon: Users, to: "/hr/employees", roles: ["admin", "manager", "hr"] },
      { label: "Departments", icon: Briefcase, to: "/hr/departments", roles: ["admin", "manager", "hr"] },
      { label: "Attendance", icon: Clock, to: "/hr/attendance", roles: ["admin", "manager", "hr"] },
      { label: "Leave", icon: Plane, to: "/hr/leave", roles: ["admin", "manager", "hr"] },
      { label: "Holidays", icon: CalendarDays, to: "/hr/holidays", roles: ["admin", "manager", "hr"] },
      { label: "Payroll", icon: Wallet, to: "/hr/payroll", roles: ["admin", "manager", "hr", "finance"] },
      { label: "Reviews & Goals", icon: ClipboardList, to: "/hr/reviews", roles: ["admin", "manager", "hr"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users & Roles", icon: Lock, to: "/users-roles", roles: ["admin", "manager"] },
      { label: "Audit Logs", icon: ClipboardList, to: "/audit-logs", roles: ["admin"] },
      { label: "Notifications", icon: Bell, to: "/notifications" },
      { label: "Settings", icon: Settings, to: "/settings", roles: ["admin"] },
    ],
  },
];

function SidebarContent({ onNavigate }) {
  return <>
    <div className="mb-4 flex items-center gap-3 px-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-brand-primary shadow-sm">Q</div>
      <div>
        <h1 className="text-xl font-black leading-tight text-white">Q Interior</h1>
        <p className="mt-0.5 text-xs font-medium text-white/55">Company management</p>
      </div>
    </div>

    <div className="mb-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-white">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55"><Sparkles size={14} />Workspace</div>
      <p className="mt-2 text-sm font-semibold">Operations, design work, clients, and finance in one dashboard.</p>
    </div>

    <nav className="space-y-4 overflow-y-auto pr-1 scrollbar-soft">
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) => !item.roles || userHasRole(item.roles));
        if (visibleItems.length === 0) return null;
        return <div key={section.label}>
          <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/38">{section.label}</p>
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/hr"}
                onClick={onNavigate}
                className={({ isActive }) => `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "bg-white text-brand-primary shadow-sm" : "text-white/72 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/15">
                  <Icon size={16} />
                </span>
                <span className="truncate font-semibold">{item.label}</span>
              </NavLink>;
            })}
          </div>
        </div>;
      })}
    </nav>

    
  </>;
}

export default function Sidebar({ open = false, onClose }) {
  return <>
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-brand-primaryDark p-3 text-brand-bg shadow-2xl lg:flex">
      <SidebarContent />
    </aside>

    {open && <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose}>
      <aside className="h-full w-[min(24rem,90vw)] bg-brand-primaryDark p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex justify-end">
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>}
  </>;
}
