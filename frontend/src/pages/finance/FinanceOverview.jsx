import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, DollarSign, Receipt, ScrollText, Wallet } from "lucide-react";
import Card from "../../components/ui/Card";
import MetricCard from "../../components/ui/MetricCard";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import SectionCard from "../../components/ui/SectionCard";
import { getFinanceOverview } from "../../services/api";

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
      description="Finance records and totals in one clean overview."
      action={<Link to="/expenses/add"><Button>Add Expense</Button></Link>}
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
