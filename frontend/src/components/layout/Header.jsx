import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { getStoredUser, logout } from "../../services/api";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return <header className="sticky top-3 z-30 mb-5 rounded-2xl border border-brand-border/80 bg-white/92 p-3 shadow-card backdrop-blur md:top-4 md:p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <button onClick={onMenuClick} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-primary transition hover:bg-brand-soft lg:hidden">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">Q Interior Admin</p>
          <h2 className="mt-1 truncate text-lg font-black text-brand-primary sm:text-xl">Business Workspace</h2>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 md:flex md:flex-row md:items-center md:gap-3">
        <div className="col-span-3 flex min-w-0 items-center gap-2 rounded-xl border border-brand-border bg-brand-soft/70 px-3 py-2 text-sm text-brand-muted md:col-span-1 md:w-72">
          <Search size={17} className="shrink-0" />
          <span className="truncate">Search clients, projects, invoices...</span>
        </div>
        <Link to="/notifications" className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-primary transition hover:bg-brand-soft">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-danger ring-2 ring-white" />
        </Link>
        <div className="min-w-0 flex items-center gap-3 rounded-xl border border-brand-border bg-white px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-sm font-black text-white">{(user?.name || "A").slice(0, 1)}</div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold text-brand-primary">{user?.name || "Admin"}</p>
            <p className="text-xs text-brand-muted">Signed in</p>
          </div>
        </div>
        <Button variant="outline" onClick={signOut} className="flex items-center justify-center gap-2 px-3 py-2.5"><LogOut size={17} /><span className="hidden sm:inline">Logout</span></Button>
      </div>
    </div>
  </header>;
}
