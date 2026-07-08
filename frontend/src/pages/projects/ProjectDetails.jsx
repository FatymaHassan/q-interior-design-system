import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ProgressBar from "../../components/ui/ProgressBar";
import Table from "../../components/ui/Table";
import { getProjectFinanceSummary } from "../../services/api";
import { formatCurrency, formatPercentage } from "../../utils/numberFormat";
import { getProject } from "./projectApi";

const tabs = ["Overview", "Contract Details", "Client Payments", "Project Expenses", "Daily Work", "Employees", "Financial Summary", "Documents"];

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [finance, setFinance] = useState(null);
  const [status, setStatus] = useState("loading");
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    Promise.all([
      getProject(id),
      getProjectFinanceSummary(id).catch(() => null),
    ]).then(([projectData, financeData]) => {
      setProject(projectData);
      setFinance(financeData);
      setStatus("connected");
    }).catch(() => setStatus("error"));
  }, [id]);

  const raw = project?.raw || {};
  const metrics = finance?.metrics || {};
  const contractSnapshot = finance?.contract_snapshot || raw.contract_snapshot || {};
  const clientPayments = finance?.client_payments || raw.payments || [];
  const projectExpenses = finance?.project_expenses || raw.expenses || [];
  const dailyWork = raw.tasks || [];
  const employees = raw.members || [];
  const documents = raw.documents || [];
  const generalRows = useMemo(() => [
    ["Project Name", project?.name],
    ["Client", project?.client],
    ["Location", project?.location],
    ["Stage", project?.stage],
    ["Status", project?.status],
    ["Start Date", dateValue(raw.start_date)],
    ["Due Date", dateValue(raw.end_date)],
    ["Deadline", project?.deadline],
  ], [project, raw.start_date, raw.end_date]);

  const contractRows = useMemo(() => [
    ["Client", contractSnapshot.client_name || project?.client],
    ["Project", contractSnapshot.project_name || project?.name],
    ["Original Contract Amount", formatCurrency(contractSnapshot.contract_amount ?? metrics.contract_amount ?? project?.contractAmount)],
    ["Original Total Quotation", formatCurrency(contractSnapshot.total_quotation ?? project?.totalQuotation)],
    ["Original Budget", formatCurrency(contractSnapshot.budget ?? project?.budget)],
    ["Original Profit %", formatPercentage(contractSnapshot.profit_percentage ?? project?.profitPercentage)],
    ["Progress", formatPercentage(project?.progress)],
    ["Payment Plan Type", raw.payment_plan_type || "-"],
    ["Original Deposit %", formatPercentage(contractSnapshot.deposit_percentage ?? raw.deposit_percentage)],
    ["Original Deposit Amount", formatCurrency(contractSnapshot.deposit_amount ?? raw.deposit_amount ?? metrics.deposit_amount)],
    ["Payment Terms", contractSnapshot.payment_terms || raw.payment_terms || "-"],
  ], [project, metrics, contractSnapshot]);

  const financeRows = [
    ["Contract Amount", formatCurrency(metrics.contract_amount ?? project?.contractAmount)],
    ["Total Quotation", formatCurrency(metrics.total_quotation ?? contractSnapshot.total_quotation)],
    ["Paid Amount", formatCurrency(metrics.paid_amount ?? metrics.received_revenue)],
    ["Remaining Balance", formatCurrency(metrics.remaining_balance ?? metrics.balance_receivable)],
    ["Payment Status", metrics.payment_status || "-"],
    ["Actual Cost", formatCurrency(metrics.actual_cost ?? metrics.total_project_expenses)],
    ["Cash Left", formatCurrency(metrics.cash_left)],
    ["Expected Profit", formatCurrency(metrics.expected_profit ?? metrics.project_profit)],
    ["Actual Profit", formatCurrency(metrics.actual_profit ?? metrics.actual_profit_from_received_money)],
    ["Payment Percentage", formatPercentage(metrics.payment_percentage ?? metrics.payment_progress)],
    ["Profit Margin", formatPercentage(metrics.profit_margin)],
  ];

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading project...</Card>;
  if (status === "error" || !project) return <Card className="p-5 text-sm text-brand-danger">Project could not be loaded.</Card>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/projects"><Button variant="outline">Back to Projects</Button></Link>
      <Link to={`/projects/${project.id}/edit`}><Button>Edit Project</Button></Link>
    </div>

    <section className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-card">
      <div className="bg-brand-primaryDark px-5 py-6 text-white md:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">Project Overview</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{project.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">{raw.description || raw.notes || "No project notes added yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{project.stage}</Badge>
            <Badge>{project.status}</Badge>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold text-brand-muted">Project progress</span>
          <b className="text-brand-primary">{project.progress}%</b>
        </div>
        <ProgressBar value={project.progress} />
      </div>
    </section>

    <Card className="p-2">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${activeTab === tab ? "bg-brand-primary text-white" : "text-brand-muted hover:bg-brand-soft hover:text-brand-primary"}`}
        >
          {tab}
        </button>)}
      </div>
    </Card>

    {activeTab === "Overview" && <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <InfoPanel title="General Information" rows={generalRows} />
      <Card className="p-5">
        <h2 className="text-lg font-black text-brand-primary">Project Notes</h2>
        <p className="mt-3 text-sm leading-6 text-brand-muted">{raw.notes || raw.description || "No notes added."}</p>
      </Card>
    </section>}

    {activeTab === "Contract Details" && <InfoPanel title="Contract Details" rows={contractRows} />}

    {activeTab === "Client Payments" && <Card className="p-5">
      <Table columns={[
        { key: "payment_date", label: "Date", render: (row) => dateValue(row.payment_date) },
        { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
        { key: "payment_type", label: "Type", render: (row) => row.payment_type || "Flexible payment" },
        { key: "related_stage", label: "Stage", render: (row) => row.related_stage || "-" },
        { key: "payment_method", label: "Method", render: (row) => row.payment_method || row.method || "-" },
        { key: "reference_number", label: "Reference", render: (row) => row.reference_number || "-" },
      ]} rows={clientPayments} empty="No client payments yet." />
    </Card>}

    {activeTab === "Project Expenses" && <Card className="p-5">
      <Table columns={[
        { key: "expense_date", label: "Date", render: (row) => dateValue(row.expense_date) },
        { key: "title", label: "Expense", render: (row) => row.title || row.item_name || row.category || "-" },
        { key: "category", label: "Category", render: (row) => row.category_model?.name || row.category || "-" },
        { key: "paid_by", label: "Paid To", render: (row) => row.supplier?.name || row.paid_by || "-" },
        { key: "amount", label: "Amount", render: (row) => formatCurrency(row.total_cost || row.amount) },
      ]} rows={projectExpenses} empty="No project expenses yet." />
    </Card>}

    {activeTab === "Daily Work" && <Card className="p-5">
      <Table columns={[
        { key: "title", label: "Work", render: (row) => row.title || "-" },
        { key: "employee", label: "Employee", render: (row) => row.assignee_employee?.name || row.assignee?.name || "-" },
        { key: "work_date", label: "Date", render: (row) => dateValue(row.work_date || row.deadline) },
        { key: "related_stage", label: "Stage", render: (row) => row.related_stage || "-" },
        { key: "progress_added", label: "Progress", render: (row) => `${Number(row.progress_added || 0)}%` },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status || "Pending"}</Badge> },
      ]} rows={dailyWork} empty="No daily work yet." />
    </Card>}

    {activeTab === "Employees" && <Card className="p-5">
      <Table columns={[
        { key: "member", label: "Member", render: (row) => row.employee?.name || row.user?.name || "-" },
        { key: "position", label: "Position", render: (row) => row.employee?.position || "-" },
        { key: "role", label: "Project Role", render: (row) => row.role || "Member" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status || "Active"}</Badge> },
      ]} rows={employees} empty="No employees assigned yet." />
    </Card>}

    {activeTab === "Financial Summary" && <section className="space-y-5">
      <InfoPanel title="Financial Summary" rows={financeRows} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-black text-brand-primary">Payment History</h2>
          <div className="mt-4">
            <Table columns={[
              { key: "payment_date", label: "Date", render: (row) => dateValue(row.payment_date) },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
              { key: "status", label: "Status", render: (row) => <Badge>{row.status || "-"}</Badge> },
              { key: "reference_number", label: "Reference", render: (row) => row.reference_number || "-" },
            ]} rows={clientPayments} empty="No client payment history yet." />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-black text-brand-primary">Expense History</h2>
          <div className="mt-4">
            <Table columns={[
              { key: "expense_date", label: "Date", render: (row) => dateValue(row.expense_date) },
              { key: "title", label: "Expense", render: (row) => row.title || row.item_name || row.category || "-" },
              { key: "approval_status", label: "Status", render: (row) => <Badge>{row.approval_status || "-"}</Badge> },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.total_cost || row.amount) },
            ]} rows={projectExpenses} empty="No project expense history yet." />
          </div>
        </Card>
      </div>
    </section>}

    {activeTab === "Documents" && <Card className="p-5">
      <Table columns={[
        { key: "title", label: "Title", render: (row) => row.title || "-" },
        { key: "document_category", label: "Category", render: (row) => row.document_category || "other" },
        { key: "visibility", label: "Visibility", render: (row) => row.visibility || "internal" },
        { key: "created_at", label: "Uploaded", render: (row) => dateValue(row.created_at) },
      ]} rows={documents} empty="No documents uploaded yet." />
    </Card>}
  </div>;
}

function InfoPanel({ title, rows }) {
  return <Card className="p-5">
    <h2 className="text-lg font-black text-brand-primary">{title}</h2>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
    </div>
  </Card>;
}

function InfoTile({ label, value }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft/65 p-3">
    <p className="text-[11px] font-black uppercase tracking-wide text-brand-muted">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-brand-primary">{value || "-"}</p>
  </div>;
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : "-";
}
