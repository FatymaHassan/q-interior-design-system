import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import LoadingState from "../../components/ui/LoadingState";
import {
  createProjectPaymentStage,
  deleteProjectPaymentStage,
  getProjectFinanceSummary,
  getProjects,
  getProjectStages,
  updateProject,
  updateProjectPaymentStage,
} from "../../services/api";
import { formatCurrency, formatPercentage, toNumber } from "../../utils/numberFormat";

const createEmptyItem = () => ({
  name: "",
  payment_type: "percentage",
  percentage: "",
  amount: "",
  due_date: "",
  due_condition: "",
  notes: "",
  status: "Pending",
});

const createEmptyPlan = () => ({
  project_id: "",
  location: "",
  project_stage_id: "",
  status: "Active",
  start_date: "",
  end_date: "",
  deadline: "",
  budget: "",
  total_quotation: "",
  profit_percentage: "",
  contract_amount: "",
  payment_plan_type: "Deposit + Final Payment",
  deposit_percentage: "",
  deposit_amount: "",
  payment_terms: "",
  current_cost: "",
  remaining_balance: "",
  progress: "",
});

export default function ProjectPlanForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stages, setStages] = useState([]);
  const [plan, setPlan] = useState(createEmptyPlan());
  const [items, setItems] = useState([createEmptyItem()]);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("loading");

  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(plan.project_id)), [projects, plan.project_id]);
  const contractAmount = toNumber(plan.contract_amount);
  const totalPlanned = items.reduce((sum, item) => sum + expectedAmount(item, contractAmount), 0);
  const totalPercentage = items.reduce((sum, item) => item.payment_type === "percentage" ? sum + toNumber(item.percentage) : sum, 0);
  const depositAmount = plan.deposit_amount !== "" ? toNumber(plan.deposit_amount) : Number(((contractAmount * toNumber(plan.deposit_percentage)) / 100).toFixed(2));
  const remainingBalance = Math.max(0, contractAmount - toNumber(selectedProject?.paidAmount));

  useEffect(() => {
    Promise.all([getProjects(), getProjectStages()])
      .then(([projectRows, stageRows]) => {
        setProjects(projectRows);
        setStages(stageRows);
        const firstProjectId = projectId || projectRows[0]?.id || "";
        setPlan((current) => ({ ...current, project_id: firstProjectId }));
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, [projectId]);

  useEffect(() => {
    if (!plan.project_id || projects.length === 0) return;
    const project = projects.find((row) => String(row.id) === String(plan.project_id));
    if (!project) return;
    loadProjectPlan(project);
  }, [plan.project_id, projects]);

  const loadProjectPlan = async (project) => {
    setNotice("");
    const raw = project.raw || {};
    try {
      const summary = await getProjectFinanceSummary(project.id);
      const metrics = summary?.metrics || {};
      const contract = toNumber(metrics.contract_amount ?? project.contractAmount);
      const currentCost = toNumber(metrics.total_project_expenses ?? raw.actual_cost);
      const quote = toNumber(raw.revenue || contract);
      setPlan({
        project_id: project.id,
        location: raw.location || project.location || "",
        project_stage_id: raw.project_stage_id || raw.stage?.id || "",
        status: raw.status || project.status || "Active",
        start_date: dateOnly(raw.start_date),
        end_date: dateOnly(raw.end_date),
        deadline: dateOnly(raw.deadline),
        budget: raw.budget ?? project.budget ?? "",
        total_quotation: quote || "",
        profit_percentage: quote > 0 && contract > 0 ? Number((((contract / quote) - 1) * 100).toFixed(2)) : "",
        contract_amount: contract || "",
        payment_plan_type: raw.payment_plan_type || project.paymentPlanType || "Deposit + Final Payment",
        deposit_percentage: raw.deposit_percentage ?? "",
        deposit_amount: metrics.deposit_amount ?? raw.deposit_amount ?? "",
        payment_terms: raw.payment_terms || "",
        current_cost: currentCost || "",
        remaining_balance: metrics.balance_receivable ?? project.remainingBalance ?? "",
        progress: raw.progress ?? project.progress ?? "",
      });
      setItems((summary?.payment_stages || []).length ? summary.payment_stages.map(mapStageToItem) : [createEmptyItem()]);
    } catch {
      setPlan((current) => ({ ...current, project_id: project.id }));
      setItems([createEmptyItem()]);
    }
  };

  const updatePlan = (field, value) => {
    setPlan((current) => {
      const next = { ...current, [field]: value };
      if (field === "total_quotation" || field === "profit_percentage") {
        const quote = toNumber(field === "total_quotation" ? value : next.total_quotation);
        const profit = toNumber(field === "profit_percentage" ? value : next.profit_percentage);
        next.contract_amount = quote > 0 ? Number((quote * (1 + (profit / 100))).toFixed(2)) : "";
      }
      if (field === "contract_amount" || field === "deposit_percentage") {
        const contract = toNumber(field === "contract_amount" ? value : next.contract_amount);
        const deposit = toNumber(field === "deposit_percentage" ? value : next.deposit_percentage);
        next.deposit_amount = contract > 0 && deposit > 0 ? Number(((contract * deposit) / 100).toFixed(2)) : "";
      }
      return next;
    });
  };

  const updateItem = (index, field, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const addItem = () => setItems((current) => [...current, createEmptyItem()]);

  const removeItem = async (index) => {
    const item = items[index];
    if (item.id && !window.confirm("Delete this payment plan row?")) return;
    if (item.id) await deleteProjectPaymentStage(item.id);
    setItems((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [createEmptyItem()];
    });
  };

  const savePlan = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!plan.project_id) return;

    await updateProject(plan.project_id, {
      location: plan.location,
      project_stage_id: plan.project_stage_id || null,
      status: plan.status,
      start_date: plan.start_date || null,
      end_date: plan.end_date || null,
      deadline: plan.deadline || null,
      budget: toNumber(plan.budget),
      revenue: toNumber(plan.total_quotation || plan.contract_amount),
      contract_amount: contractAmount,
      payment_plan_type: plan.payment_plan_type,
      deposit_percentage: toNumber(plan.deposit_percentage),
      deposit_amount: depositAmount,
      payment_terms: plan.payment_terms,
      progress: toNumber(plan.progress),
    });

    await Promise.all(items.filter((item) => item.name || item.amount || item.percentage || item.due_date || item.due_condition).map((item) => {
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
      return item.id ? updateProjectPaymentStage(item.id, payload) : createProjectPaymentStage(plan.project_id, payload);
    }));

    setNotice("Project plan saved.");
    navigate(`/project-plans/${plan.project_id}/edit`, { replace: true });
  };

  if (status === "loading") return <LoadingState label="Loading project plan..." />;
  if (status === "error") return <Card className="p-4 text-sm text-brand-danger">Project plan form could not be loaded.</Card>;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">{projectId ? "Edit Project Plan" : "Add Project Plan"}</h1>
        <p className="mt-1 text-sm text-brand-muted">Enter the project plan in the same order as the Excel sheet, then add payment rows below.</p>
      </div>
      <Link to="/project-plans"><Button variant="outline">Back to List</Button></Link>
    </div>

    {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
    {totalPercentage > 100 && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Warning: planned percentage is above 100%.</p>}
    {totalPlanned > contractAmount && contractAmount > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Warning: planned amount is higher than the contract amount.</p>}

    <form onSubmit={savePlan} className="space-y-5">
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Project Name">
            <select value={plan.project_id} onChange={(event) => updatePlan("project_id", event.target.value)} className={fieldInputClass}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </FormField>
          <ReadonlyField label="Client Name" value={selectedProject?.client || "-"} />
          <FormField label="Location">
            <input value={plan.location} onChange={(event) => updatePlan("location", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Stage">
            <select value={plan.project_stage_id} onChange={(event) => updatePlan("project_stage_id", event.target.value)} className={fieldInputClass}>
              <option value="">No stage</option>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={plan.status} onChange={(event) => updatePlan("status", event.target.value)} className={fieldInputClass}>
              <option>Pending</option>
              <option>Active</option>
              <option>In Progress</option>
              <option>Delayed</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </FormField>
          <FormField label="Start Date">
            <input type="date" value={plan.start_date} onChange={(event) => updatePlan("start_date", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={plan.end_date} onChange={(event) => updatePlan("end_date", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Deadline">
            <input type="date" value={plan.deadline} onChange={(event) => updatePlan("deadline", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Budget">
            <input type="number" min="0" step="0.01" value={plan.budget} onChange={(event) => updatePlan("budget", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Total Quotation">
            <input type="number" min="0" step="0.01" value={plan.total_quotation} onChange={(event) => updatePlan("total_quotation", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Profit %">
            <input type="number" min="0" step="0.01" value={plan.profit_percentage} onChange={(event) => updatePlan("profit_percentage", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Contract Amount">
            <input type="number" min="0" step="0.01" value={plan.contract_amount} onChange={(event) => updatePlan("contract_amount", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Payment Plan Type">
            <input value={plan.payment_plan_type} onChange={(event) => updatePlan("payment_plan_type", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Deposit %">
            <input type="number" min="0" max="100" step="0.01" value={plan.deposit_percentage} onChange={(event) => updatePlan("deposit_percentage", event.target.value)} className={fieldInputClass} />
          </FormField>
          <FormField label="Deposit Amount">
            <input type="number" min="0" step="0.01" value={plan.deposit_amount} onChange={(event) => updatePlan("deposit_amount", event.target.value)} className={fieldInputClass} />
          </FormField>
          <ReadonlyField label="Current Cost" value={formatCurrency(plan.current_cost)} />
          <ReadonlyField label="Remaining Balance" value={formatCurrency(plan.remaining_balance || remainingBalance)} />
          <FormField label="Progress %">
            <input type="number" min="0" max="100" step="0.01" value={plan.progress} onChange={(event) => updatePlan("progress", event.target.value)} className={fieldInputClass} />
          </FormField>
          <ReadonlyField label="Planned Amount" value={formatCurrency(totalPlanned)} />
          <ReadonlyField label="Planned %" value={formatPercentage(totalPercentage)} />
        </div>
        <div className="mt-4">
          <FormField label="Payment Terms">
            <textarea value={plan.payment_terms} onChange={(event) => updatePlan("payment_terms", event.target.value)} className={`${fieldInputClass} min-h-24`} />
          </FormField>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-primary">Payment Plan Rows</h2>
            <p className="mt-1 text-sm text-brand-muted">The form starts with one blank row. Add more rows only when you need them.</p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={addItem}><Plus size={16} />Add Row</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="text-xs uppercase text-brand-muted">
              <tr><th className="p-2">Payment Title</th><th className="p-2">Type</th><th className="p-2">%</th><th className="p-2">Expected Amount</th><th className="p-2">Due Date</th><th className="p-2">Due Stage</th><th className="p-2">Status</th><th className="p-2">Notes</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => <tr key={item.id || index} className="border-t border-brand-border">
                <td className="p-2"><input value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} className={fieldInputClass} placeholder="Deposit, Design approval..." /></td>
                <td className="p-2"><select value={item.payment_type} onChange={(event) => updateItem(index, "payment_type", event.target.value)} className={fieldInputClass}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></td>
                <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={item.percentage} onChange={(event) => updateItem(index, "percentage", event.target.value)} disabled={item.payment_type !== "percentage"} className={fieldInputClass} /></td>
                <td className="p-2"><input type="number" min="0" step="0.01" value={item.payment_type === "percentage" ? expectedAmount(item, contractAmount).toFixed(2) : item.amount} onChange={(event) => updateItem(index, "amount", event.target.value)} disabled={item.payment_type === "percentage"} className={fieldInputClass} /></td>
                <td className="p-2"><input type="date" value={item.due_date} onChange={(event) => updateItem(index, "due_date", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><input value={item.due_condition} onChange={(event) => updateItem(index, "due_condition", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><select value={item.status} onChange={(event) => updateItem(index, "status", event.target.value)} className={fieldInputClass}><option>Pending</option><option>Due</option><option>Partially Paid</option><option>Paid</option><option>Overdue</option><option>Cancelled</option></select></td>
                <td className="p-2"><input value={item.notes} onChange={(event) => updateItem(index, "notes", event.target.value)} className={fieldInputClass} /></td>
                <td className="p-2"><Button type="button" variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeItem(index)}><Trash2 size={14} /></Button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link to="/project-plans"><Button type="button" variant="outline">Cancel</Button></Link>
        <Button disabled={!plan.project_id} className="gap-2"><Save size={16} />Save Project Plan</Button>
      </div>
    </form>
  </div>;
}

function mapStageToItem(stage) {
  return {
    id: stage.id,
    name: stage.name || "",
    payment_type: stage.payment_type || (Number(stage.percentage || 0) > 0 ? "percentage" : "fixed"),
    percentage: stage.percentage || "",
    amount: stage.amount || "",
    due_date: dateOnly(stage.due_date),
    due_condition: stage.due_condition || "",
    notes: stage.notes || "",
    status: stage.status || "Pending",
  };
}

function expectedAmount(item, contractAmount) {
  return item.payment_type === "percentage" ? Number(((contractAmount * toNumber(item.percentage)) / 100).toFixed(2)) : toNumber(item.amount);
}

function ReadonlyField({ label, value }) {
  return <div>
    <span className="mb-1 block text-sm font-semibold text-brand-primary">{label}</span>
    <div className="flex min-h-11 items-center rounded-lg border border-brand-border bg-brand-soft px-3 text-sm font-semibold text-brand-primary">{value || "-"}</div>
  </div>;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}
