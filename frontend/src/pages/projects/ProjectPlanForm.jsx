import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import LoadingState from "../../components/ui/LoadingState";
import {
  createProjectPaymentStage,
  getProjectFinanceSummary,
  getProjects,
  getProjectStages,
  updateProject,
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
  const [item, setItem] = useState(createEmptyItem());
  const [existingItems, setExistingItems] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("loading");

  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(plan.project_id)), [projects, plan.project_id]);
  const contractAmount = toNumber(plan.contract_amount);
  const existingPlanned = existingItems.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const existingPercentage = existingItems.reduce((sum, row) => sum + toNumber(row.percentage), 0);
  const newItemAmount = expectedAmount(item, contractAmount);
  const newItemPercentage = item.payment_type === "percentage" ? toNumber(item.percentage) : 0;
  const totalPlanned = existingPlanned + newItemAmount;
  const totalPercentage = existingPercentage + newItemPercentage;
  const remainingPercentage = Math.max(0, 100 - existingPercentage);
  const planIsFull = existingPercentage >= 100;
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
      setExistingItems(summary?.payment_stages || []);
      setItem(createEmptyItem());
    } catch {
      setPlan((current) => ({ ...current, project_id: project.id }));
      setExistingItems([]);
      setItem(createEmptyItem());
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

  const updateItem = (field, value) => setItem((current) => ({ ...current, [field]: value }));

  const savePlan = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!plan.project_id) return;

    const hasNewPlanItem = item.name || item.amount || item.percentage || item.due_date || item.due_condition;
    if (hasNewPlanItem && planIsFull) {
      setError("This project plan is already full. You cannot add more plan items because it already reached 100%.");
      return;
    }
    if (hasNewPlanItem && item.payment_type === "percentage" && totalPercentage > 100) {
      setError(`This project plan is already full enough. Remaining percentage: ${remainingPercentage.toFixed(2)}%.`);
      return;
    }

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

    if (hasNewPlanItem) {
      await createProjectPaymentStage(plan.project_id, {
        name: item.name || "Payment stage",
        payment_type: item.payment_type,
        percentage: item.payment_type === "percentage" ? toNumber(item.percentage) : 0,
        amount: newItemAmount,
        due_date: item.due_date || null,
        due_condition: item.due_condition,
        status: item.status || "Pending",
        notes: item.notes,
      });
    }

    navigate(`/project-plans/${plan.project_id}/edit`, { replace: true });
    const project = projects.find((row) => String(row.id) === String(plan.project_id));
    if (project) await loadProjectPlan(project);
    setNotice(hasNewPlanItem ? "Project plan item saved." : "Project plan details saved.");
  };

  if (status === "loading") return <LoadingState label="Loading project plan..." />;
  if (status === "error") return <Card className="p-4 text-sm text-brand-danger">Project plan form could not be loaded.</Card>;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">{projectId ? "Edit Project Plan" : "Add Project Plan"}</h1>
        <p className="mt-1 text-sm text-brand-muted">Choose the project, then add one flexible plan item at a time.</p>
      </div>
      <Link to="/project-plans"><Button variant="outline">Back to List</Button></Link>
    </div>

    {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</p>}
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-brand-danger">{error}</p>}
    {planIsFull && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">This project plan is already full at 100%. You cannot add more plan items.</p>}
    {!planIsFull && totalPercentage > 100 && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">This new plan item is above the remaining percentage. Remaining percentage: {remainingPercentage.toFixed(2)}%.</p>}
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
            <select value={plan.payment_plan_type} onChange={(event) => updatePlan("payment_plan_type", event.target.value)} className={fieldInputClass}>
              <option>Deposit + Final Payment</option>
              <option>Milestone Payment</option>
              <option>Monthly Payment</option>
              <option>Custom Payment Plan</option>
            </select>
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
            <h2 className="text-lg font-bold text-brand-primary">Add One Plan Item</h2>
            <p className="mt-1 text-sm text-brand-muted">Save one plan item, then add another only if the project plan is not full.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <ReadonlyField label="Existing %" value={formatPercentage(existingPercentage)} />
            <ReadonlyField label="Remaining %" value={formatPercentage(remainingPercentage)} />
            <ReadonlyField label="New Amount" value={formatCurrency(newItemAmount)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Plan Item">
            <input value={item.name} onChange={(event) => updateItem("name", event.target.value)} disabled={planIsFull} className={fieldInputClass} placeholder="Deposit, Design approval..." />
          </FormField>
          <FormField label="Amount Type">
            <select value={item.payment_type} onChange={(event) => updateItem("payment_type", event.target.value)} disabled={planIsFull} className={fieldInputClass}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </FormField>
          <FormField label="Percentage">
            <input type="number" min="0" max={remainingPercentage} step="0.01" value={item.percentage} onChange={(event) => updateItem("percentage", event.target.value)} disabled={planIsFull || item.payment_type !== "percentage"} className={fieldInputClass} />
          </FormField>
          <FormField label="Expected Amount">
            <input type="number" min="0" step="0.01" value={item.payment_type === "percentage" ? newItemAmount.toFixed(2) : item.amount} onChange={(event) => updateItem("amount", event.target.value)} disabled={planIsFull || item.payment_type === "percentage"} className={fieldInputClass} />
          </FormField>
          <FormField label="Due Date">
            <input type="date" value={item.due_date} onChange={(event) => updateItem("due_date", event.target.value)} disabled={planIsFull} className={fieldInputClass} />
          </FormField>
          <FormField label="Due Stage">
            <input value={item.due_condition} onChange={(event) => updateItem("due_condition", event.target.value)} disabled={planIsFull} className={fieldInputClass} placeholder="Design approval, Completion..." />
          </FormField>
          <FormField label="Status">
            <select value={item.status} onChange={(event) => updateItem("status", event.target.value)} disabled={planIsFull} className={fieldInputClass}>
              <option>Pending</option>
              <option>Due</option>
              <option>Partially Paid</option>
              <option>Paid</option>
              <option>Overdue</option>
              <option>Cancelled</option>
            </select>
          </FormField>
          <FormField label="Notes">
            <input value={item.notes} onChange={(event) => updateItem("notes", event.target.value)} disabled={planIsFull} className={fieldInputClass} />
          </FormField>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-brand-primary">Existing Plan Items</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {existingItems.length === 0 && <p className="text-sm text-brand-muted">No plan items saved yet.</p>}
          {existingItems.map((row) => <div key={row.id} className="rounded-lg border border-brand-border bg-brand-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <b className="text-brand-primary">{row.name}</b>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-brand-muted">{row.status || "Pending"}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Info label="Type" value={row.payment_type || "percentage"} />
              <Info label="Percent" value={formatPercentage(row.percentage)} />
              <Info label="Amount" value={formatCurrency(row.amount)} />
              <Info label="Due Date" value={dateOnly(row.due_date) || "-"} />
            </div>
            {row.due_condition && <p className="mt-3 text-sm text-brand-muted">{row.due_condition}</p>}
          </div>)}
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Link to="/project-plans"><Button type="button" variant="outline">Cancel</Button></Link>
        <Button disabled={!plan.project_id} className="gap-2"><Save size={16} />Save Project Plan</Button>
      </div>
    </form>
  </div>;
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

function Info({ label, value }) {
  return <div>
    <span className="block text-xs font-semibold uppercase text-brand-muted">{label}</span>
    <b className="text-brand-primary">{value || "-"}</b>
  </div>;
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : "";
}
