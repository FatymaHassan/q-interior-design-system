import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Briefcase, CheckCircle, DollarSign, FileText, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import LoadingState from "../../components/ui/LoadingState";
import { getDashboardSummary, getExecutiveDashboard, getProjects } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: "", project_id: "" });
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    return getDashboardSummary(clean(filters))
      .then((summary) => getExecutiveDashboard(clean(filters))
        .then((data) => ({ ...data, kpis: summary }))
        .catch(() => ({ kpis: summary, recent: {} })))
      .then((data) => {
        setDashboard(data);
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
    getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  const kpis = dashboard?.kpis || {};
  const recent = dashboard?.recent || {};
  const alertRows = [
    { label: "Overdue invoices", value: kpis.overdue_payments, tone: "danger", to: "/invoices" },
    { label: "Pending tasks", value: kpis.pending_tasks, tone: "warning", to: "/daily-tasks" },
    { label: "Low stock materials", value: kpis.low_stock_materials, tone: "warning", to: "/inventory" },
    { label: "Pending leave", value: kpis.pending_leave_requests, tone: "default", to: "/hr/leave" },
  ];

  return <div className="space-y-5">
    <PageHeader
      eyebrow="Dashboard"
      title="Today Overview"
      description="A simple management view with the numbers that need attention first."
      action={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
        <select value={filters.project_id} onChange={(event) => setFilters({ ...filters, project_id: event.target.value })} className="col-span-2 h-10 rounded-lg border border-brand-border bg-white px-3 text-sm sm:col-span-1 sm:min-w-56">
          <option value="">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm"><option value="">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
        <input type="number" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm sm:w-24" />
        <Button type="button" onClick={load}>Apply</Button>
      </div>}
    />

    {status === "loading" && <LoadingState label="Loading dashboard data..." />}
    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Dashboard could not be loaded. Please check the backend connection.</Card>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Contract Amount" value={money(kpis.total_contract_amount)} icon={Briefcase} helper="All project value" />
      <MetricCard label="Revenue Received" value={money(kpis.total_revenue_received ?? kpis.total_revenue)} icon={DollarSign} helper="Client payments" />
      <MetricCard label="Balance Receivable" value={money(kpis.total_balance_receivable)} icon={Wallet} helper="Still unpaid" />
      <MetricCard label="Project Expenses" value={money(kpis.total_project_expenses ?? kpis.total_project_costs)} icon={Wallet} helper="Direct costs" />
      <MetricCard label="Actual Profit" value={money(kpis.actual_profit ?? kpis.gross_profit)} icon={CheckCircle} tone={toNumber(kpis.actual_profit ?? kpis.gross_profit) >= 0 ? "success" : "danger"} helper="Revenue minus project costs" />
      <MetricCard label="Expected Profit" value={money(kpis.expected_profit)} icon={TrendingUp} tone={toNumber(kpis.expected_profit) >= 0 ? "success" : "danger"} helper="Contract minus project costs" />
      <MetricCard label="Cash Left" value={money(kpis.cash_left ?? kpis.gross_profit)} icon={TrendingUp} tone={toNumber(kpis.cash_left ?? kpis.gross_profit) >= 0 ? "success" : "danger"} helper="Revenue minus costs" />
      <MetricCard label="Net Profit" value={money(kpis.net_profit)} icon={CheckCircle} tone={toNumber(kpis.net_profit) >= 0 ? "success" : "danger"} helper={kpis.scope === "project" ? "Selected project" : "After company costs"} />
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-[1fr_360px]">
      <Card className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-brand-primary">Business Snapshot</h2>
            <p className="mt-1 text-sm text-brand-muted">Only the main counts, without extra tables.</p>
          </div>
          <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-brand-gold">Open full reports <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <HealthTile label="Projects" value={kpis.total_projects} icon={Briefcase} />
          <HealthTile label="Active" value={kpis.active_projects} icon={Briefcase} />
          <HealthTile label="Clients" value={kpis.total_clients} icon={Users} />
          <HealthTile label="Quotes" value={kpis.pending_quotations} icon={FileText} />
          <HealthTile label="Employees" value={kpis.active_employees ?? kpis.total_employees} icon={Users} />
          <HealthTile label="Invoices" value={kpis.outstanding_invoices} icon={AlertTriangle} />
        </div>
      </Card>

      <SectionCard title="Quick Actions" subtitle="Common daily entries.">
        <div className="grid grid-cols-1 gap-2">
          <QuickLink to="/projects/add" label="New project" />
          <QuickLink to="/payments/add" label="Record payment" />
          <QuickLink to="/expenses/add" label="Add expense" />
          <QuickLink to="/quotations/add" label="Create quotation" />
        </div>
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-[360px_1fr]">
      <SectionCard title="Needs Attention" subtitle="Small list of work that may need action.">
        <div className="space-y-2">
          {alertRows.map((row) => <Link key={row.label} to={row.to} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-soft/55 p-3 text-sm transition hover:border-teal-200 hover:bg-white">
            <span className="flex items-center gap-2 font-semibold text-brand-primary"><AlertTriangle size={16} className={row.tone === "danger" ? "text-brand-danger" : "text-brand-warning"} />{row.label}</span>
            <b className="text-brand-primary">{row.value ?? 0}</b>
          </Link>)}
        </div>
      </SectionCard>

      <Card className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-brand-primary">Latest Activity</h2>
            <p className="mt-1 text-sm text-brand-muted">A short feed only. Full tables stay in their modules.</p>
          </div>
          <Link to="/reports"><Button variant="outline" className="px-3 py-2">Reports</Button></Link>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <ActivityList title="Revenue" rows={(recent.revenue || []).slice(0, 3)} render={(row) => `${row.client || "-"} - ${money(row.amount)}`} />
          <ActivityList title="Expenses" rows={(recent.expenses || []).slice(0, 3)} render={(row) => `${row.category || "-"} - ${money(row.amount)}`} />
          <ActivityList title="Projects" rows={(recent.projects || []).slice(0, 3)} render={(row) => row.name || row.project_name || "-"} />
        </div>
      </Card>
    </section>
  </div>;
}

function ActivityList({ title, rows, render }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft/50 p-3">
    <h3 className="text-sm font-black text-brand-primary">{title}</h3>
    <div className="mt-3 space-y-2">
      {rows.length ? rows.map((row) => <div key={`${title}-${row.id}`} className="rounded-lg bg-white px-3 py-2 text-sm">
        <b className="block truncate text-brand-primary">{render(row)}</b>
        <span className="text-xs text-brand-muted">{dateLabel(row.date || row.created_at)}</span>
      </div>) : <p className="text-sm text-brand-muted">No recent records.</p>}
    </div>
  </div>;
}

function HealthTile({ label, value, icon: Icon }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft/60 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase text-brand-muted">{label}</span>
      <Icon size={16} className="shrink-0 text-brand-gold" />
    </div>
    <b className="mt-2 block text-xl text-brand-primary">{value ?? 0}</b>
  </div>;
}

function QuickLink({ to, label }) {
  return <Link to={to} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-white px-3 py-3 text-sm font-bold text-brand-primary transition hover:border-teal-200 hover:bg-brand-goldSoft">
    <span className="flex items-center gap-2"><Plus size={16} className="text-brand-gold" />{label}</span>
    <ArrowRight size={16} />
  </Link>;
}

function money(value) {
  return formatCurrency(value);
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function clean(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}
