import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Plus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { getProjectFinanceSummary, getProjects } from "../../services/api";
import { formatCurrency, formatPercentage, toNumber } from "../../utils/numberFormat";

export default function ProjectPlans() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");

  const load = () => getProjects()
    .then(async (projects) => {
      const planRows = await Promise.all(projects.map((project) => getProjectFinanceSummary(project.id)
        .then((summary) => planRow(project, summary))
        .catch(() => planRow(project, null))));
      setRows(planRows);
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => { load(); }, []);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => [
      row.projectName,
      row.clientName,
      row.location,
      row.stage,
      row.status,
      row.paymentPlanType,
    ].join(" ").toLowerCase().includes(term));
  }, [query, rows]);

  if (status === "error") return <Card className="p-4 text-sm text-brand-danger">Project plans could not be loaded.</Card>;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Project Plans</h1>
        <p className="mt-1 text-sm text-brand-muted">List of project plan records using the same planning columns as the Excel workbook.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/project-plans/add"><Button className="gap-2"><Plus size={16} />Add Project Plan</Button></Link>
        <Link to="/projects/add"><Button variant="outline">Add Project</Button></Link>
      </div>
    </div>

    <Card className="p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px_220px]">
        <FormField label="Search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={fieldInputClass} placeholder="Project, client, stage..." />
        </FormField>
        <PlanMetric label="Projects" value={filteredRows.length} />
        <PlanMetric label="Planned" value={formatCurrency(filteredRows.reduce((sum, row) => sum + row.totalPlanned, 0))} />
        <PlanMetric label="Remaining" value={formatCurrency(filteredRows.reduce((sum, row) => sum + row.remainingBalance, 0))} />
      </div>

      <Table columns={[
        { key: "projectName", label: "Project Name", render: (row) => <b>{row.projectName}</b> },
        { key: "clientName", label: "Client Name" },
        { key: "location", label: "Location" },
        { key: "stage", label: "Stage" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "startDate", label: "Start Date" },
        { key: "dueDate", label: "Due Date" },
        { key: "deadline", label: "Deadline" },
        { key: "budget", label: "Budget", render: (row) => formatCurrency(row.budget) },
        { key: "totalQuotation", label: "Total Quotation", render: (row) => formatCurrency(row.totalQuotation) },
        { key: "profitPercentage", label: "Profit %", render: (row) => formatPercentage(row.profitPercentage) },
        { key: "contractAmount", label: "Contract Amount", render: (row) => formatCurrency(row.contractAmount) },
        { key: "paymentPlanType", label: "Payment Plan Type" },
        { key: "depositPercentage", label: "Deposit %", render: (row) => formatPercentage(row.depositPercentage) },
        { key: "depositAmount", label: "Deposit Amount", render: (row) => formatCurrency(row.depositAmount) },
        { key: "currentCost", label: "Current Cost", render: (row) => formatCurrency(row.currentCost) },
        { key: "remainingBalance", label: "Remaining Balance", render: (row) => formatCurrency(row.remainingBalance) },
        { key: "progress", label: "Progress %", render: (row) => formatPercentage(row.progress) },
        { key: "planStatus", label: "Plan Status", render: (row) => <Badge>{row.planStatus}</Badge> },
        { key: "action", label: "Action", render: (row) => <Link to={`/project-plans/${row.projectId}/edit`}><Button variant="outline" className="gap-2 px-3 py-2"><Edit size={14} />Edit</Button></Link> },
      ]} rows={filteredRows} empty={status === "loading" ? "Loading project plans..." : "No project plans found."} />
    </Card>
  </div>;
}

function planRow(project, summary) {
  const raw = project.raw || {};
  const stages = summary?.payment_stages || [];
  const metrics = summary?.metrics || {};
  const contractAmount = toNumber(metrics.contract_amount ?? project.contractAmount);
  const totalPaid = toNumber(metrics.received_revenue);
  const totalPlanned = stages.reduce((sum, stage) => sum + toNumber(stage.amount), 0);
  const currentCost = toNumber(metrics.total_project_expenses ?? raw.actual_cost);
  const remainingBalance = toNumber(metrics.balance_receivable ?? project.remainingBalance);
  const totalQuotation = toNumber(raw.revenue || contractAmount);
  const profitPercentage = totalQuotation > 0 && contractAmount > 0 ? ((contractAmount / totalQuotation) - 1) * 100 : 0;

  return {
    projectId: project.id,
    projectName: project.name,
    clientName: project.client,
    location: project.location,
    stage: project.stage,
    status: project.status,
    startDate: dateOnly(raw.start_date),
    dueDate: dateOnly(raw.end_date),
    deadline: dateOnly(raw.deadline),
    budget: toNumber(project.budget),
    totalQuotation,
    profitPercentage,
    contractAmount,
    paymentPlanType: raw.payment_plan_type || project.paymentPlanType || "Not set",
    depositPercentage: toNumber(raw.deposit_percentage),
    depositAmount: toNumber(metrics.deposit_amount ?? raw.deposit_amount),
    paymentTerms: raw.payment_terms || "",
    currentCost,
    remainingBalance,
    progress: toNumber(project.progress),
    totalPlanned,
    totalPaid,
    planStatus: stages.length === 0 ? "Draft" : stages.every((stage) => stage.status === "Paid") ? "Paid" : "Active",
  };
}

function PlanMetric({ label, value }) {
  return <div className="rounded-lg border border-brand-border bg-brand-soft px-4 py-3">
    <span className="block text-xs font-bold uppercase text-brand-muted">{label}</span>
    <b className="mt-1 block text-brand-primary">{value}</b>
  </div>;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "-";
}
