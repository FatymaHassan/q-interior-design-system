import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, Briefcase, CheckCircle, DollarSign, FileText, TrendingUp, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import MetricCard from "../../components/ui/MetricCard";
import Table from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import { getExecutiveDashboard } from "../../services/api";

const colors = ["#0F2747", "#2563EB", "#14B8A6", "#22C55E", "#F59E0B", "#EF4444"];

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: "" });
  const [status, setStatus] = useState("loading");

  const load = () => getExecutiveDashboard(clean(filters))
    .then((data) => { setDashboard(data); setStatus("connected"); })
    .catch(() => setStatus("error"));

  useEffect(() => {
    load();
  }, []);

  const kpis = dashboard?.kpis || {};
  const charts = dashboard?.charts || {};

  return <div className="space-y-4">
    <PageHeader
      eyebrow="Executive Dashboard"
      title="Management Overview"
      description="Finance, projects, quotations, HR, inventory, and daily operations in one clear workspace."
      action={<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm"><option value="">All months</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>
          <input type="number" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="h-10 w-full rounded-lg border border-brand-border bg-white px-3 text-sm sm:w-24" />
          <Button type="button" onClick={load}>Apply</Button>
          <Link to="/reports"><Button variant="outline">Reports</Button></Link>
        </div>}
    />

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Dashboard could not be loaded. Please check the backend connection.</Card>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 min-[1340px]:grid-cols-4">
      <MetricCard label="Total Revenue" value={money(kpis.total_revenue)} icon={DollarSign} />
      <MetricCard label="Total Expenses" value={money(kpis.total_expenses)} icon={Wallet} />
      <MetricCard label="Net Profit" value={money(kpis.net_profit)} icon={CheckCircle} />
      <MetricCard label="Profit Margin" value={`${kpis.profit_margin ?? 0}%`} icon={TrendingUp} />
      <MetricCard label="Active Projects" value={kpis.active_projects ?? "..."} icon={Briefcase} />
      <MetricCard label="Completed Projects" value={kpis.completed_projects ?? "..."} icon={CheckCircle} />
      <MetricCard label="Pending Quotations" value={kpis.pending_quotations ?? "..."} icon={FileText} />
      <MetricCard label="Approved Quotations" value={kpis.approved_quotations ?? "..."} icon={FileText} />
      <MetricCard label="Outstanding Invoices" value={kpis.outstanding_invoices ?? "..."} icon={AlertTriangle} />
      <MetricCard label="Overdue Tasks" value={kpis.overdue_tasks ?? "..."} icon={AlertTriangle} />
      <MetricCard label="Low Stock Materials" value={kpis.low_stock_materials ?? "..."} icon={Boxes} />
      <MetricCard label="Active Employees" value={kpis.active_employees ?? "..."} icon={Users} />
    </section>

    <section className="grid grid-cols-1 gap-4 min-[1180px]:grid-cols-2">
      <ChartCard title="Monthly Revenue vs Expenses" subtitle="Compare income and spending performance by month.">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={charts.monthly_revenue_expenses || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#0F2747" radius={[8, 8, 0, 0]} />
            <Bar dataKey="expenses" fill="#2563EB" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Profit Trend" subtitle="Net movement after expenses for the selected period.">
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={(charts.monthly_revenue_expenses || []).map((row) => ({ ...row, profit: Number(row.revenue || 0) - Number(row.expenses || 0) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="profit" stroke="#14b8a6" strokeWidth={3} dot={false} />
          </LineChart>
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
      <SectionCard title="Operational Alerts" subtitle="Items that need management attention."><InfoRows rows={[
        ["Overdue Payments", kpis.overdue_payments],
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

function SectionHeading({ title, subtitle }) {
  return <div className="mb-4">
    <h2 className="font-black text-brand-primary">{title}</h2>
    {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
  </div>;
}

function InfoRows({ rows }) {
  return <div className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft/70 p-3 text-sm"><span className="text-brand-muted">{label}</span><b className="text-right text-brand-primary">{value ?? 0}</b></div>)}</div>;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function clean(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}
