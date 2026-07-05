import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createProjectPaymentStage, deleteProjectPaymentStage, getProjectFinanceSummary, getProjects, updateProjectPaymentStage } from "../../services/api";
import { formatCurrency, formatPercentage, toNumber } from "../../utils/numberFormat";

const emptyItem = { name: "", payment_type: "percentage", percentage: "", amount: "", due_date: "", due_condition: "", notes: "", status: "Pending" };

export default function ProjectPlans() {
  const [projects, setProjects] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [items, setItems] = useState([emptyItem]);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("loading");

  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(selectedProjectId)), [projects, selectedProjectId]);
  const contractAmount = toNumber(selectedProject?.contractAmount);
  const totalPlanned = items.reduce((sum, item) => sum + expectedAmount(item, contractAmount), 0);
  const totalPercentage = items.reduce((sum, item) => item.payment_type === "percentage" ? sum + toNumber(item.percentage) : sum, 0);

  const load = () => getProjects()
    .then(async (projectRows) => {
      setProjects(projectRows);
      const rows = await Promise.all(projectRows.map((project) => getProjectFinanceSummary(project.id).then((summary) => planRow(project, summary)).catch(() => planRow(project, null))));
      setSummaries(rows);
      setSelectedProjectId((current) => current || projectRows[0]?.id || "");
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const summary = summaries.find((row) => String(row.project.id) === String(selectedProjectId));
    if (summary?.stages?.length) {
      setItems(summary.stages.map((stage) => ({
        id: stage.id,
        name: stage.name || "",
        payment_type: stage.payment_type || (Number(stage.percentage || 0) > 0 ? "percentage" : "fixed"),
        percentage: stage.percentage || "",
        amount: stage.amount || "",
        due_date: stage.due_date ? String(stage.due_date).slice(0, 10) : "",
        due_condition: stage.due_condition || "",
        notes: stage.notes || "",
        status: stage.status || "Pending",
      })));
    } else {
      setItems([emptyItem]);
    }
  }, [selectedProjectId, summaries]);

  const updateItem = (index, field, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const addItem = () => setItems((current) => [...current, emptyItem]);
  const removeItem = async (index) => {
    const item = items[index];
    if (item.id && !window.confirm("Delete this payment plan row?")) return;
    if (item.id) await deleteProjectPaymentStage(item.id);
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    load();
  };

  const savePlan = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!selectedProjectId) return;
    await Promise.all(items.filter((item) => item.name || item.amount || item.percentage).map((item) => {
      const payload = {
        name: item.name || "Payment stage",
        payment_type: item.payment_type,
        percentage: item.payment_type === "percentage" ? toNumber(item.percentage) : 0,
        amount: expectedAmount(item, contractAmount),
        due_date: item.due_date || null,
        due_condition: item.due_condition,
        status: item.status || "Pending",
        notes: item.notes,
      };
      return item.id ? updateProjectPaymentStage(item.id, payload) : createProjectPaymentStage(selectedProjectId, payload);
    }));
    setNotice("Project plan saved.");
    load();
  };

  if (status === "error") return <Card className="p-4 text-sm text-brand-danger">Project plans could not be loaded.</Card>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Project Plans</h1>
        <p className="mt-1 text-sm text-brand-muted">Create flexible percentage or fixed-amount payment plans after a project exists.</p>
      </div>
      <Link to="/projects/add"><Button variant="outline">Add Project</Button></Link>
    </div>

    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">All Project Plans</h2>
      <Table columns={[
        { key: "project", label: "Project", render: (row) => <b>{row.project.name}</b> },
        { key: "client", label: "Client", render: (row) => row.project.client },
        { key: "contract", label: "Contract", render: (row) => formatCurrency(row.contractAmount) },
        { key: "planned", label: "Planned", render: (row) => formatCurrency(row.totalPlanned) },
        { key: "paid", label: "Paid", render: (row) => formatCurrency(row.totalPaid) },
        { key: "remaining", label: "Remaining", render: (row) => formatCurrency(row.remainingContract) },
        { key: "progress", label: "Payment Progress", render: (row) => formatPercentage(row.paymentProgress) },
        { key: "status", label: "Plan Status", render: (row) => <Badge>{row.planStatus}</Badge> },
        { key: "action", label: "Action", render: (row) => <Button variant="outline" className="px-3 py-2" onClick={() => setSelectedProjectId(row.project.id)}>Edit plan</Button> },
      ]} rows={summaries} empty="No projects found." />
    </Card>

    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold">Create / Edit Plan</h2>
          <p className="mt-1 text-sm text-brand-muted">Draft and incomplete plans are allowed. Warnings do not block saving.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <WarningTile label="Planned amount" value={formatCurrency(totalPlanned)} warn={totalPlanned > contractAmount && contractAmount > 0} />
          <WarningTile label="Planned percentage" value={formatPercentage(totalPercentage)} warn={totalPercentage > 100} />
          <WarningTile label="Contract" value={formatCurrency(contractAmount)} />
        </div>
      </div>
      {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
      {(totalPlanned > contractAmount && contractAmount > 0) && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Warning: total planned amount is higher than the contract amount.</p>}
      {totalPercentage > 100 && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Warning: total planned percentage is higher than 100%.</p>}
      <form onSubmit={savePlan} className="mt-5 space-y-4">
        <FormField label="Project">
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className={fieldInputClass}>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name} - {project.client}</option>)}
          </select>
        </FormField>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr><th className="p-2">Payment title</th><th className="p-2">Type</th><th className="p-2">%</th><th className="p-2">Expected amount</th><th className="p-2">Due date</th><th className="p-2">Due stage</th><th className="p-2">Status</th><th className="p-2">Notes</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => <tr key={item.id || index} className="border-t border-brand-border">
                <td className="p-2"><input value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><select value={item.payment_type} onChange={(event) => updateItem(index, "payment_type", event.target.value)} className={fieldInputClass}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></td>
                <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={item.percentage} onChange={(event) => updateItem(index, "percentage", event.target.value)} disabled={item.payment_type !== "percentage"} className={fieldInputClass} /></td>
                <td className="p-2"><input type="number" min="0" step="0.01" value={item.payment_type === "percentage" ? expectedAmount(item, contractAmount).toFixed(2) : item.amount} onChange={(event) => updateItem(index, "amount", event.target.value)} disabled={item.payment_type === "percentage"} className={fieldInputClass} /></td>
                <td className="p-2"><input type="date" value={item.due_date} onChange={(event) => updateItem(index, "due_date", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><input value={item.due_condition} onChange={(event) => updateItem(index, "due_condition", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><select value={item.status} onChange={(event) => updateItem(index, "status", event.target.value)} className={fieldInputClass}><option>Pending</option><option>Partially Paid</option><option>Paid</option></select></td>
                <td className="p-2"><input value={item.notes} onChange={(event) => updateItem(index, "notes", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><Button type="button" variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeItem(index)}><Trash2 size={14} /></Button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={addItem}><Plus size={16} />Add Row</Button>
          <Button disabled={!selectedProjectId}>Save Plan</Button>
        </div>
      </form>
    </Card>
  </div>;
}

function expectedAmount(item, contractAmount) {
  return item.payment_type === "percentage" ? Number(((contractAmount * toNumber(item.percentage)) / 100).toFixed(2)) : toNumber(item.amount);
}

function planRow(project, summary) {
  const stages = summary?.payment_stages || [];
  const metrics = summary?.metrics || {};
  const contractAmount = toNumber(metrics.contract_amount ?? project.contractAmount);
  const totalPlanned = stages.reduce((sum, stage) => sum + toNumber(stage.amount), 0);
  const totalPaid = toNumber(metrics.received_revenue);
  return {
    id: project.id,
    project,
    stages,
    contractAmount,
    totalPlanned,
    totalPaid,
    remainingContract: Math.max(0, contractAmount - totalPaid),
    paymentProgress: contractAmount > 0 ? (totalPaid / contractAmount) * 100 : 0,
    planStatus: stages.length === 0 ? "Draft" : stages.every((stage) => stage.status === "Paid") ? "Paid" : "Active",
  };
}

function WarningTile({ label, value, warn = false }) {
  return <div className={`rounded-lg px-3 py-2 ${warn ? "bg-amber-50 text-brand-warning" : "bg-brand-soft text-brand-primary"}`}><span className="block text-xs font-semibold">{label}</span><b>{value}</b></div>;
}
