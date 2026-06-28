import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, DollarSign, FileSpreadsheet, Receipt, ScrollText, Wallet } from "lucide-react";
import Card from "../../components/ui/Card";
import MetricCard from "../../components/ui/MetricCard";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import { downloadReportExport, getFinanceOverview } from "../../services/api";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;

export default function FinanceOverview() {
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    getFinanceOverview()
      .then((data) => {
        setOverview(data);
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, []);

  return <div className="space-y-4">
    <PageHeader
      eyebrow="Finance"
      title="Finance Overview"
      description="Invoices, budget tracking, expense control, cash flow, and financial reports."
      action={<div className="flex flex-wrap gap-2">
        <Link to="/invoices"><Button variant="outline">Create Invoice</Button></Link>
        <Link to="/expenses/add"><Button>Add Expense</Button></Link>
        <Link to="/payments/add"><Button variant="outline">Add Payment</Button></Link>
        <Link to="/overheads/add"><Button variant="outline">Add Overhead</Button></Link>
        <Link to="/finance/pnl"><Button variant="outline">P&L Summary</Button></Link>
      </div>}
    />

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Finance overview could not be loaded.</Card>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total Revenue" value={money(overview?.total_revenue)} icon={DollarSign} />
      <MetricCard label="Project Expenses" value={money(overview?.total_project_expenses)} icon={Receipt} />
      <MetricCard label="Company Overhead" value={money(overview?.total_overhead)} icon={Receipt} />
      <MetricCard label="Payroll" value={money(overview?.total_payroll)} icon={Receipt} />
      <MetricCard label="Net Profit" value={money(overview?.net_profit)} icon={Wallet} />
      <MetricCard label="Gross Profit" value={money(overview?.gross_profit)} icon={Wallet} />
      <MetricCard label="Profit Margin" value={`${Number(overview?.profit_margin || 0)}%`} icon={DollarSign} />
      <MetricCard label="Supplier Payments" value={money(overview?.total_supplier_payments)} icon={Wallet} />
      <MetricCard label="Pending Expenses" value={overview?.pending_expenses ?? "..."} icon={Receipt} />
      <MetricCard label="Outstanding Invoices" value={overview?.outstanding_invoices ?? "..."} icon={ScrollText} />
      <MetricCard label="Overdue Invoices" value={overview?.overdue_invoices ?? "..."} icon={AlertTriangle} />
    </section>

    <SectionCard title="Budget Tracker" subtitle="Actual spend against project budget with 80% warning alerts and profit margin." action={<Link to="/projects/add"><Button variant="outline">Set Project Budget</Button></Link>}>
      <Table
        columns={[
          { key: "project", label: "Project", render: (row) => <b>{row.project}</b> },
          { key: "client", label: "Client" },
          { key: "budget", label: "Budget", render: (row) => money(row.budget) },
          { key: "actual_spend", label: "Actual Spend", render: (row) => money(row.actual_spend) },
          { key: "budget_used_percent", label: "Used", render: (row) => <span className={row.alert ? "font-bold text-brand-danger" : "font-semibold text-brand-primary"}>{row.budget_used_percent}%</span> },
          { key: "profit", label: "Profit", render: (row) => money(row.profit) },
          { key: "profit_margin", label: "Margin", render: (row) => `${row.profit_margin}%` },
          { key: "alert", label: "Alert", render: (row) => row.over_budget ? "Over budget" : row.alert ? "Above 80%" : "Healthy" },
        ]}
        rows={overview?.budget_tracker || []}
        empty="No project budgets yet."
      />
    </SectionCard>

    <SectionCard title="Financial Reports" subtitle="Export Profit & Loss, Cash Flow, revenue breakdowns, and invoice status lists." action={<Link to="/reports"><Button variant="outline">Open Reports Center</Button></Link>}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["profit-loss", "P&L"],
          ["cash-flow", "Cash Flow"],
          ["revenue-by-project", "By Project"],
          ["revenue-by-client", "By Client"],
          ["outstanding-invoices", "Outstanding"],
        ].map(([key, label]) => <Button key={key} type="button" variant="outline" className="gap-2" onClick={() => downloadReportExport(key, "excel")}>
          <FileSpreadsheet size={16} />{label}
        </Button>)}
      </div>
    </SectionCard>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Recent Expenses">
        <Table
          columns={[
            { key: "title", label: "Item", render: (expense) => <b>{expense.title || expense.item_name}</b> },
            { key: "project", label: "Project", render: (expense) => expense.project?.name || expense.project?.project_name || "-" },
            { key: "amount", label: "Amount", render: (expense) => money(expense.total_cost || expense.amount) },
            { key: "approval_status", label: "Status" },
          ]}
          rows={overview?.recent_expenses || []}
          empty="No recent expenses."
        />
      </SectionCard>
      <SectionCard title="Recent Invoices">
        <Table
          columns={[
            { key: "invoice_number", label: "Invoice", render: (invoice) => <b>{invoice.invoice_number}</b> },
            { key: "client", label: "Client", render: (invoice) => invoice.client?.name || "-" },
            { key: "due_date", label: "Due" },
            { key: "total_amount", label: "Total", render: (invoice) => money(invoice.total_amount) },
            { key: "status", label: "Status" },
          ]}
          rows={overview?.recent_invoices || []}
          empty="No recent invoices."
        />
      </SectionCard>
      <SectionCard title="Recent Payments">
        <Table
          columns={[
            { key: "client", label: "Client", render: (payment) => payment.client?.name || "-" },
            { key: "project", label: "Project", render: (payment) => payment.project?.name || payment.project?.project_name || "-" },
            { key: "payment_date", label: "Date" },
            { key: "amount", label: "Amount", render: (payment) => money(payment.amount) },
          ]}
          rows={overview?.recent_payments || []}
          empty="No recent payments."
        />
      </SectionCard>
    </section>
  </div>;
}
