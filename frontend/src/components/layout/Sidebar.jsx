import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bell, Boxes, Briefcase, CalendarDays, CheckSquare, ChevronDown, ClipboardList, Clock, Columns3, FileText, Image, Inbox, LayoutDashboard, Lock, Plane, Receipt, ScrollText, Settings, Tags, UserRoundCog, Users, Wallet, X } from "lucide-react";
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
      { label: "Project Plans", icon: ClipboardList, to: "/project-plans", roles: ["admin", "manager", "finance"] },
      { label: "Client Payments", icon: Wallet, to: "/project-client-payments", roles: ["admin", "manager", "finance"] },
      { label: "Project Expenses", icon: Receipt, to: "/project-expenses", roles: ["admin", "manager", "finance"] },
      { label: "Project Board", icon: Columns3, to: "/project-board" },
      { label: "Daily Tasks", icon: CheckSquare, to: "/daily-tasks" },
      { label: "Photos", icon: Image, to: "/photos" },
      { label: "Documents", icon: FileText, to: "/documents" },
      { label: "Client Messages", icon: Inbox, to: "/client-messages" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "P&L Summary", icon: ClipboardList, to: "/finance", roles: ["admin", "manager", "finance"] },
      { label: "Invoices", icon: ScrollText, to: "/invoices", roles: ["admin", "manager", "finance"] },
      { label: "Expenses", icon: Receipt, to: "/expenses", roles: ["admin", "manager", "finance"] },
      { label: "Expense Categories", icon: Tags, to: "/expense-categories", roles: ["admin", "manager", "finance"] },
      { label: "Suppliers", icon: Users, to: "/suppliers", roles: ["admin", "manager", "finance"] },
      { label: "Payments", icon: Wallet, to: "/payments", roles: ["admin", "manager", "finance"] },
      { label: "Overheads", icon: FileText, to: "/overheads", roles: ["admin", "manager", "finance"] },
      { label: "Payroll", icon: Wallet, to: "/finance/payroll", roles: ["admin", "manager", "finance"] },
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
      { label: "Attendance Setup", icon: Settings, to: "/hr/attendance-settings", roles: ["admin", "manager", "hr"] },
      { label: "Leave", icon: Plane, to: "/hr/leave", roles: ["admin", "manager", "hr"] },
      { label: "Holidays", icon: CalendarDays, to: "/hr/holidays", roles: ["admin", "manager", "hr"] },
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

const isItemActive = (pathname, item) => {
  if (item.to === "/dashboard" || item.to === "/finance" || item.to === "/hr") return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
};

function SidebarContent({ onNavigate }) {
  const location = useLocation();
  const visibleSections = useMemo(() => sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || userHasRole(item.roles)),
    }))
    .filter((section) => section.items.length > 0), []);
  const activeSection = visibleSections.find((section) => section.items.some((item) => isItemActive(location.pathname, item)))?.label || visibleSections[0]?.label;
  const [openSection, setOpenSection] = useState(activeSection);

  useEffect(() => {
    if (activeSection) setOpenSection(activeSection);
  }, [activeSection]);

  return <>
    <div className="mb-3 flex items-center gap-3 px-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg font-black text-brand-primary shadow-sm">Q</div>
      <div className="min-w-0">
        <h1 className="text-xl font-black leading-tight text-white">Q Interior</h1>
        <p className="mt-0.5 text-xs font-medium text-white/55">Company management</p>
      </div>
    </div>

    <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-soft">
      {visibleSections.map((section) => {
        const isOpen = openSection === section.label;
        const hasActiveItem = section.items.some((item) => isItemActive(location.pathname, item));
        const SectionIcon = section.items[0]?.icon || LayoutDashboard;

        return <div key={section.label} className="rounded-xl border border-white/8 bg-white/[0.035] p-1">
          <button
            type="button"
            onClick={() => setOpenSection((current) => current === section.label ? "" : section.label)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${hasActiveItem || isOpen ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"}`}
            aria-expanded={isOpen}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <SectionIcon size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate font-bold">{section.label}</span>
            <ChevronDown size={16} className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
          </button>

          <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="space-y-1 pb-1 pt-1.5">
                {section.items.map((item) => {
              const Icon = item.icon;
              return <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/hr" || item.to === "/finance" || item.to === "/dashboard"}
                onClick={onNavigate}
                className={({ isActive }) => `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  isActive ? "bg-white text-brand-primary shadow-sm" : "text-white/68 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/15">
                  <Icon size={16} />
                </span>
                <span className="truncate font-semibold">{item.label}</span>
              </NavLink>;
            })}
              </div>
            </div>
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
      <aside className="flex h-full w-[min(24rem,90vw)] flex-col bg-brand-primaryDark p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex justify-end">
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>}
  </>;
}
