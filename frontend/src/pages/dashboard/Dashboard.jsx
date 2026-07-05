import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Briefcase, CheckCircle, DollarSign, FileText, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import MetricCard from "../../components/ui/MetricCard";
import Table from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import LoadingState from "../../components/ui/LoadingState";
import { getDashboardSummary, getExecutiveDashboard } from "../../services/api";
import { formatCurrency, formatPercentage, toNumber } from "../../utils/numberFormat";

const colors = ["#18342F", "#0F766E", "#25685E", "#15803D", "#B45309", "#B42318"];

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: "" });
  const [status, setStatus] = useState("loading");

  const load = () => Promise.all([getDashboardSummary(clean(filters)), getExecutiveDashboard(clean(filters))])
    .then(([summary, data]) => { setDashboard({ ...data, kpis: summary }); setStatus("connected"); })
    .catch(() => setStatus("error"));

  useEffect(() => {
    load();
  }, []);

  const kpis = dashboard?.kpis || {};
  const charts = dashboard?.charts || {};
  const recent = dashboard?.recent || {};

  const alertRows = [
    { label: "Overdue payments", value: kpis.overdue_payments, tone: "danger", to: "/invoices" },
    { label: "Pending tasks", value: kpis.pending_tasks, tone: "warning", to: "/daily-tasks" },
    { label: "Low stock materials", value: kpis.low_stock_materials, tone: "warning", to: "/inventory" },
    { label: "Pending leave requests", value: kpis.pending_leave_requests, tone: "default", to: "/hr/leave" },
  ];

  return <div className="space-y-5">
    <PageHeader
      eyebrow="Executive Dashboard"
      title="Management Overview"
      description="Live finance, delivery, client, inventory, and HR signals for daily management decisions."
      action={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm"><option value="">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
          <input type="number" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm sm:w-24" />
          <Button type="button" onClick={load}>Apply</Button>
          <Link to="/reports"><Button variant="outline">Reports</Button></Link>
        </div>}
    />

    {status === "loading" && <LoadingState label="Loading live dashboard data..." />}
    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Dashboard could not be loaded. Please check the backend connection.</Card>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Contract Amount" value={money(kpis.total_contract_amount)} icon={Briefcase} helper="Expected value from all projects" />
      <MetricCard label="Revenue Received" value={money(kpis.total_revenue_received ?? kpis.total_revenue)} icon={DollarSign} helper="Actual client payments collected" />
      <MetricCard label="Balance Receivable" value={money(kpis.total_balance_receivable)} icon={Wallet} helper="Contract value still unpaid" />
      <MetricCard label="Net Profit" value={money(kpis.net_profit)} icon={CheckCircle} tone={toNumber(kpis.net_profit) >= 0 ? "success" : "danger"} helper="After recorded company costs" />
      <MetricCard label="Project Expenses" value={money(kpis.total_project_expenses ?? kpis.total_project_costs)} icon={Wallet} helper="Direct project costs" />
      <MetricCard label="Gross Profit" value={money(kpis.gross_profit)} icon={TrendingUp} tone={toNumber(kpis.gross_profit) >= 0 ? "success" : "danger"} helper="Received revenue minus project expenses" />
      <MetricCard label="Company Expenses" value={money(toNumber(kpis.overhead_expenses ?? kpis.company_overhead) + toNumber(kpis.payroll_expenses) + toNumber(kpis.other_company_expenses))} icon={Wallet} helper="Overhead, payroll, and other costs" />
      <MetricCard label="Profit Margin" value={formatPercentage(kpis.profit_margin)} icon={TrendingUp} tone="success" helper="Business margin for this view" />
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-[1fr_360px]">
      <Card className="p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-brand-primary">Business Health</h2>
            <p className="mt-1 text-sm text-brand-muted">A quick read of the areas managers check most often.</p>
          </div>
          <Link to="/reports" className="inline-flex items-center gap-2 text-sm font-bold text-brand-gold">Open reports <ArrowRight size={16} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <HealthTile label="Active projects" value={kpis.active_projects} icon={Briefcase} />
          <HealthTile label="Clients" value={kpis.total_clients} icon={Users} />
          <HealthTile label="Pending quotes" value={kpis.pending_quotations} icon={FileText} />
          <HealthTile label="Employees" value={kpis.active_employees ?? kpis.total_employees} icon={Users} />
          <HealthTile label="Documents" value={kpis.total_documents} icon={FileText} />
          <HealthTile label="Outstanding invoices" value={kpis.outstanding_invoices} icon={AlertTriangle} />
          <HealthTile label="Completed projects" value={kpis.completed_projects} icon={CheckCircle} />
          <HealthTile label="Pending client payments" value={kpis.pending_client_payments} icon={DollarSign} />
        </div>
      </Card>

      <SectionCard title="Quick Actions" subtitle="Create the records teams use every day.">
        <div className="grid grid-cols-1 gap-2">
          <QuickLink to="/projects/add" label="New project" />
          <QuickLink to="/payments/add" label="Record payment" />
          <QuickLink to="/expenses/add" label="Add expense" />
          <QuickLink to="/quotations/add" label="Create quotation" />
        </div>
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <ChartCard title="Monthly Profit / Loss" subtitle="Revenue, expenses, and profit movement for the selected year.">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={(charts.monthly_revenue_expenses || []).map((row) => ({ ...row, profit: toNumber(row.revenue) - toNumber(row.expenses) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DFE7E2" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(value) => money(value)} />
            <Line type="monotone" dataKey="revenue" stroke="#18342F" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="expenses" stroke="#B42318" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="profit" stroke="#0F766E" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <SectionCard title="Notifications & Alerts" subtitle="Items that need attention.">
        <div className="space-y-2">
          {alertRows.map((row) => <Link key={row.label} to={row.to} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-soft/55 p-3 text-sm transition hover:border-teal-200 hover:bg-white">
            <span className="flex items-center gap-2 font-semibold text-brand-primary"><AlertTriangle size={16} className={row.tone === "danger" ? "text-brand-danger" : "text-brand-warning"} />{row.label}</span>
            <b className="text-brand-primary">{row.value ?? 0}</b>
          </Link>)}
        </div>
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
      <SectionCard title="Latest Revenue" subtitle="Newest client payments saved in finance.">
        <Table columns={[
          { key: "date", label: "Date" },
          { key: "client", label: "Client" },
          { key: "project", label: "Project" },
          { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        ]} rows={recent.revenue || []} empty="No revenue payments yet." />
      </SectionCard>
      <SectionCard title="Latest Expenses" subtitle="Newest project or company costs saved.">
        <Table columns={[
          { key: "date", label: "Date" },
          { key: "project", label: "Project" },
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        ]} rows={recent.expenses || []} empty="No expenses yet." />
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
      <SectionCard title="Recently Added Clients" subtitle="Newest client records.">
        <Table columns={[
          { key: "name", label: "Client" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "created_at", label: "Created", render: (row) => dateLabel(row.created_at) },
        ]} rows={recent.clients || []} empty="No clients yet." />
      </SectionCard>
      <SectionCard title="Recently Added Projects" subtitle="Newest project records.">
        <Table columns={[
          { key: "name", label: "Project", render: (row) => row.name || row.project_name || "-" },
          { key: "client", label: "Client", render: (row) => row.client?.name || "-" },
          { key: "status", label: "Status" },
          { key: "created_at", label: "Created", render: (row) => dateLabel(row.created_at) },
        ]} rows={recent.projects || []} empty="No projects yet." />
      </SectionCard>
      <SectionCard title="Recently Added Employees" subtitle="Newest employee profiles.">
        <Table columns={[
          { key: "name", label: "Employee" },
          { key: "position", label: "Role" },
          { key: "department", label: "Department", render: (row) => row.department?.name || "-" },
          { key: "created_at", label: "Created", render: (row) => dateLabel(row.created_at) },
        ]} rows={recent.employees || []} empty="No employees yet." />
      </SectionCard>
      <SectionCard title="Recently Uploaded Documents" subtitle="Newest project documents and photos.">
        <Table columns={[
          { key: "title", label: "Document" },
          { key: "project", label: "Project", render: (row) => row.project?.name || row.project?.project_name || "-" },
          { key: "document_category", label: "Category" },
          { key: "created_at", label: "Uploaded", render: (row) => dateLabel(row.created_at) },
        ]} rows={recent.documents || []} empty="No documents uploaded yet." />
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
      <ChartCard title="Revenue vs Expenses" subtitle="Compare income and spending performance by month.">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={charts.monthly_revenue_expenses || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DFE7E2" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(value) => money(value)} />
            <Bar dataKey="revenue" fill="#18342F" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" fill="#0F766E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Project Status Breakdown" subtitle="Current project distribution across delivery stages.">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={charts.project_status_breakdown || []} dataKey="total" nameKey="status" outerRadius={90} label>
              {(charts.project_status_breakdown || []).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expense by Category" subtitle="Top operating cost groups from finance records.">
        <Table columns={[{ key: "category", label: "Category" }, { key: "total", label: "Total", render: (row) => money(row.total) }]} rows={charts.expense_by_category || []} empty="No expense data yet." />
      </ChartCard>
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-3">
      <SectionCard title="Operational Summary" subtitle="Secondary management numbers."><InfoRows rows={[
        ["Overdue Payments", kpis.overdue_payments],
        ["Pending Client Payments", kpis.pending_client_payments],
        ["Overhead Expenses", money(kpis.overhead_expenses ?? kpis.company_overhead)],
        ["Payroll Expenses", money(kpis.payroll_expenses)],
        ["Other Company Expenses", money(kpis.other_company_expenses)],
        ["Pending Tasks", kpis.pending_tasks],
        ["Pending Purchase Orders", kpis.pending_purchase_orders],
        ["Pending Leave Requests", kpis.pending_leave_requests],
        ["Payroll Pending Approval", kpis.payroll_pending_approval],
        ["Supplier Outstanding Balance", money(kpis.supplier_outstanding_balance)],
      ]} /></SectionCard>
      <SectionCard title="Inventory Low Stock" subtitle="Materials that may block active work." className="min-[1180px]:col-span-2"><Table columns={[{ key: "name", label: "Material" }, { key: "current_stock", label: "Stock" }, { key: "minimum_stock", label: "Minimum" }, { key: "stock_status", label: "Status" }]} rows={charts.inventory_low_stock || []} empty="No low-stock materials." /></SectionCard>
    </section>
  </div>;
}

function ChartCard({ title, subtitle, children }) {
  return <SectionCard title={title} subtitle={subtitle}>{children}</SectionCard>;
}

function InfoRows({ rows }) {
  return <div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-lg border border-brand-border bg-brand-soft/70 p-3 text-sm"><span className="text-brand-muted">{label}</span><b className="text-right text-brand-primary">{value ?? 0}</b></div>)}</div>;
}

function HealthTile({ label, value, icon: Icon }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft/60 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</span>
      <Icon size={16} className="shrink-0 text-brand-gold" />
    </div>
    <b className="mt-2 block text-xl text-brand-primary">{value ?? "..."}</b>
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
