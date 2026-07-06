import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bell, Boxes, Briefcase, CalendarDays, CheckSquare, ChevronDown, ChevronLeft, ClipboardList, Clock, Columns3, FileText, Image, Inbox, LayoutDashboard, Lock, Plane, Receipt, ScrollText, Settings, UserRoundCog, Users, Wallet, X } from "lucide-react";
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
      { label: "Daily Work", icon: CheckSquare, to: "/daily-tasks" },
      { label: "Client Payments", icon: Wallet, to: "/project-client-payments", roles: ["admin", "manager", "finance"] },
      { label: "Project Expenses", icon: Receipt, to: "/project-expenses", roles: ["admin", "manager", "finance"] },
      { label: "Project Financial Summary", icon: ClipboardList, to: "/finance/pnl", roles: ["admin", "manager", "finance"] },
      { label: "Project Board", icon: Columns3, to: "/project-board" },
      { label: "Photos", icon: Image, to: "/photos" },
      { label: "Documents", icon: FileText, to: "/documents" },
      { label: "Client Messages", icon: Inbox, to: "/client-messages" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Reports", icon: ClipboardList, to: "/finance", roles: ["admin", "manager", "finance"] },
      { label: "Invoices", icon: ScrollText, to: "/invoices", roles: ["admin", "manager", "finance"] },
      { label: "Suppliers", icon: Users, to: "/suppliers", roles: ["admin", "manager", "finance"] },
      { label: "Office Expenses", icon: FileText, to: "/overheads", roles: ["admin", "manager", "finance"] },
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
    <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-4 pt-1">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-tight text-white">Q Interior</h1>
        <p className="mt-1 text-xs font-medium text-white/45">Company management</p>
      </div>
      <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-white/70 shadow-sm transition hover:bg-white/16 hover:text-white" aria-label="Collapse sidebar">
        <ChevronLeft size={16} />
      </button>
    </div>

    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-soft">
      {visibleSections.map((section) => {
        const isOpen = openSection === section.label;
        const hasActiveItem = section.items.some((item) => isItemActive(location.pathname, item));

        return <div key={section.label} className="py-0.5">
          <button
            type="button"
            onClick={() => setOpenSection((current) => current === section.label ? "" : section.label)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-[15px] transition ${
              hasActiveItem || isOpen
                ? "bg-white/17 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-white/62 hover:bg-white/8 hover:text-white"
            }`}
            aria-expanded={isOpen}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{section.label}</span>
            <ChevronDown size={15} className={`shrink-0 text-white/55 transition ${isOpen ? "rotate-180 text-white" : ""}`} />
          </button>

          <div className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="ml-3 mt-1 space-y-0.5 border-l border-white/14 py-1 pl-3">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/hr" || item.to === "/finance" || item.to === "/dashboard"}
                    onClick={onNavigate}
                    className={({ isActive }) => `group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition ${
                      isActive ? "text-white" : "text-white/56 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    {({ isActive }) => <>
                      <span className={`absolute -left-[13px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition ${isActive ? "bg-brand-gold" : "bg-transparent"}`} />
                      <Icon size={15} className={`shrink-0 transition ${isActive ? "text-brand-gold" : "text-white/42 group-hover:text-white/72"}`} />
                      <span className={`truncate ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                    </>}
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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/10 bg-brand-primaryDark p-4 text-brand-bg shadow-2xl lg:flex">
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
