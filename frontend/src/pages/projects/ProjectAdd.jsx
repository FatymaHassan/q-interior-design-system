import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { addProjectMember, getClients, getEmployees, getProjectStages } from "../../services/api";
import { toNumber } from "../../utils/numberFormat";
import { createProject } from "./projectApi";

const emptyForm = {
  client_id: "",
  project_stage_id: "",
  name: "",
  location: "",
  start_date: "",
  end_date: "",
  deadline: "",
  budget: "",
  contract_amount: "",
  payment_plan_type: "Deposit + Progress Payments",
  deposit_percentage: "30",
  deposit_amount: "",
  payment_terms: "30% deposit, 50% after project start, 20% after completion.",
  actual_cost: "0",
  progress: "0",
  status: "Active",
  description: "",
};

const initialPaymentStages = [
  { name: "Deposit", percentage: "30", amount: "", due_condition: "Before project starts", due_date: "", status: "Pending", notes: "" },
  { name: "Second Payment", percentage: "50", amount: "", due_condition: "After project start", due_date: "", status: "Pending", notes: "" },
  { name: "Final Payment", percentage: "20", amount: "", due_condition: "On completion", due_date: "", status: "Pending", notes: "" },
];

export default function ProjectAdd() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [paymentStages, setPaymentStages] = useState(initialPaymentStages);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getClients(), getProjectStages(), getEmployees({ status: "Active" })]).then(([clientData, stageData, employeeData]) => {
      setClients(clientData);
      setStages(stageData);
      setEmployees(employeeData);
      setForm((current) => ({ ...current, client_id: clientData[0]?.id || "", project_stage_id: stageData[0]?.id || "" }));
      setStatus("connected");
    }).catch((error) => {
      setNotice(error.response?.status === 401 ? "Your session expired. Please login again." : "Could not load clients. Check that the backend is running.");
      setStatus("fallback");
    });
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateContractField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      const amount = toNumber(name === "contract_amount" ? value : next.contract_amount || next.budget);
      const percent = toNumber(name === "deposit_percentage" ? value : next.deposit_percentage);
      if (name === "contract_amount" || name === "deposit_percentage") {
        next.deposit_amount = amount ? String(((amount * percent) / 100).toFixed(2)) : "";
      }
      if (name === "contract_amount" && !next.budget) next.budget = value;
      return next;
    });
  };
  const contractAmount = toNumber(form.contract_amount || form.budget);
  const paymentPlanTotal = paymentStages.reduce((sum, stage) => sum + toNumber(stage.percentage), 0);
  const paymentPlanWarning = paymentPlanTotal !== 100;
  const updatePaymentStage = (index, field, value) => {
    setPaymentStages((current) => current.map((stage, stageIndex) => {
      if (stageIndex !== index) return stage;
      const next = { ...stage, [field]: value };
      if (field === "percentage") {
        next.amount = contractAmount ? String(((contractAmount * toNumber(value)) / 100).toFixed(2)) : "";
      }
      return next;
    }));
  };
  const addPaymentStage = () => setPaymentStages((current) => [...current, { name: "", percentage: "", amount: "", due_condition: "", due_date: "", status: "Pending", notes: "" }]);
  const removePaymentStage = (index) => setPaymentStages((current) => current.filter((_, stageIndex) => stageIndex !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      if (paymentPlanTotal > 100 && !window.confirm("The payment plan total is above 100%. Save this project anyway?")) {
        setSaving(false);
        return;
      }
      const project = await createProject({
        ...form,
        client_id: Number(form.client_id),
        project_stage_id: form.project_stage_id ? Number(form.project_stage_id) : null,
        budget: toNumber(form.budget),
        contract_amount: toNumber(form.contract_amount || form.budget),
        payment_plan_type: form.payment_plan_type,
        deposit_percentage: toNumber(form.deposit_percentage),
        deposit_amount: toNumber(form.deposit_amount),
        payment_terms: form.payment_terms,
        actual_cost: toNumber(form.actual_cost),
        progress: toNumber(form.progress),
        allow_over_plan: paymentPlanTotal > 100,
        payment_stages: paymentStages.map((stage) => ({
          ...stage,
          percentage: toNumber(stage.percentage),
          amount: stage.amount ? toNumber(stage.amount) : Number(((toNumber(form.contract_amount || form.budget) * toNumber(stage.percentage)) / 100).toFixed(2)),
        })),
      });
      await Promise.all(selectedMembers.map((member) => addProjectMember(project.id, {
        employee_id: Number(member.employee_id),
        role_on_project: member.role_on_project || "Member",
        assigned_date: member.assigned_date || new Date().toISOString().slice(0, 10),
        notes: member.notes || "",
      })));
      navigate("/projects");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save project. Check that the backend is running.");
    } finally {
      setSaving(false);
    }
  };

  const addSelectedMember = (employeeId) => {
    if (!employeeId || selectedMembers.some((member) => Number(member.employee_id) === Number(employeeId))) return;
    const employee = employees.find((member) => Number(member.id) === Number(employeeId));
    setSelectedMembers((current) => [...current, { employee_id: employeeId, name: employee?.name || "Employee", role_on_project: employee?.position || "Member", assigned_date: new Date().toISOString().slice(0, 10), notes: "" }]);
  };

  return <div className="space-y-6">
    <div><Link to="/projects"><Button variant="outline">Back to Projects</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Add Project</h2>
      {notice && <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm text-brand-primary">{notice}</p>}
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice || "Could not load project form data."}</p>}
      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} required disabled={status !== "connected"} className={fieldInputClass}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
        <FormField label="Stage"><select name="project_stage_id" value={form.project_stage_id} onChange={updateField} className={fieldInputClass}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></FormField>
        <FormField label="Project name"><input name="name" value={form.name} onChange={updateField} required placeholder="Modern apartment redesign" className={fieldInputClass} /></FormField>
        <FormField label="Location"><input name="location" value={form.location} onChange={updateField} placeholder="Mogadishu, Hodan..." className={fieldInputClass} /></FormField>
        <FormField label="Start date"><input name="start_date" type="date" value={form.start_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Due date"><input name="end_date" type="date" value={form.end_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Deadline"><input name="deadline" type="date" value={form.deadline} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Budget"><input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={updateField} required placeholder="5000" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-bold text-brand-primary">Project Payment Plan</h3>
              <p className="mt-1 text-sm text-brand-muted">Plan client installments from the contract amount. Actual payments are recorded later as revenue.</p>
            </div>
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${paymentPlanWarning ? "bg-amber-50 text-brand-warning" : "bg-emerald-50 text-emerald-700"}`}>Total {paymentPlanTotal.toFixed(2)}%</div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField label="Contract amount"><input name="contract_amount" type="number" min="0" step="0.01" value={form.contract_amount} onChange={updateContractField} required placeholder="10000" className={fieldInputClass} /></FormField>
            <FormField label="Payment plan type"><select name="payment_plan_type" value={form.payment_plan_type} onChange={updateContractField} className={fieldInputClass}><option>Deposit + Progress Payments</option><option>Deposit + Final Payment</option><option>Milestone Payments</option><option>Full Payment</option><option>Custom Payment Plan</option></select></FormField>
            <FormField label="Deposit %"><input name="deposit_percentage" type="number" min="0" max="100" step="0.01" value={form.deposit_percentage} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Deposit amount"><input name="deposit_amount" type="number" min="0" step="0.01" value={form.deposit_amount} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Payment terms" className="lg:col-span-2"><textarea name="payment_terms" value={form.payment_terms} onChange={updateContractField} rows="3" className={fieldInputClass} /></FormField>
          </div>
          {paymentPlanWarning && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Payment plan total should be 100%. You can still save if this is intentional.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="text-xs uppercase text-brand-muted">
                <tr><th className="p-2">Payment title</th><th className="p-2">%</th><th className="p-2">Expected amount</th><th className="p-2">Due stage</th><th className="p-2">Due date</th><th className="p-2">Status</th><th className="p-2">Notes</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {paymentStages.map((stage, index) => <tr key={index} className="border-t border-brand-border">
                  <td className="p-2"><input value={stage.name} onChange={(event) => updatePaymentStage(index, "name", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={stage.percentage} onChange={(event) => updatePaymentStage(index, "percentage", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" value={stage.amount || (contractAmount ? ((contractAmount * toNumber(stage.percentage)) / 100).toFixed(2) : "")} onChange={(event) => updatePaymentStage(index, "amount", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><input value={stage.due_condition} onChange={(event) => updatePaymentStage(index, "due_condition", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><input type="date" value={stage.due_date} onChange={(event) => updatePaymentStage(index, "due_date", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><select value={stage.status} onChange={(event) => updatePaymentStage(index, "status", event.target.value)} className={fieldInputClass}><option>Pending</option><option>Partially Paid</option><option>Paid</option></select></td>
                  <td className="p-2"><input value={stage.notes} onChange={(event) => updatePaymentStage(index, "notes", event.target.value)} className={fieldInputClass} /></td>
                  <td className="p-2"><Button type="button" variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removePaymentStage(index)}>Remove</Button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" className="mt-3" onClick={addPaymentStage}>Add Installment</Button>
        </div>
        <FormField label="Current cost"><input name="actual_cost" type="number" min="0" step="0.01" value={form.actual_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Progress %"><input name="progress" type="number" min="0" max="100" step="0.01" value={form.progress} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Active</option><option>Pending</option><option>Completed</option><option>Cancelled</option></select></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-bold text-brand-primary">Employee Assignment</h3><p className="text-sm text-brand-muted">Select employees from Employee Directory and define their project roles.</p></div>
            <Link to="/hr/employees/add"><Button type="button" variant="outline">Add Employee</Button></Link>
          </div>
          <select onChange={(event) => { addSelectedMember(event.target.value); event.target.value = ""; }} className={fieldInputClass}>
            <option value="">Select employee</option>
            {employees.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.position}{member.specialty ? ` (${member.specialty})` : ""}</option>)}
          </select>
          <div className="mt-3 space-y-3">
            {selectedMembers.map((member, index) => <div key={member.employee_id} className="grid grid-cols-1 gap-2 rounded-xl bg-brand-soft p-3 md:grid-cols-[1fr_1fr_160px_auto]">
              <b className="self-center text-sm">{member.name}</b>
              <input value={member.role_on_project} onChange={(event) => setSelectedMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role_on_project: event.target.value } : item))} className={fieldInputClass} />
              <input type="date" value={member.assigned_date} onChange={(event) => setSelectedMembers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assigned_date: event.target.value } : item))} className={fieldInputClass} />
              <Button type="button" variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => setSelectedMembers((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
            </div>)}
          </div>
        </div>
        <div className="lg:col-span-2"><FormField label="Project scope"><textarea name="description" value={form.description} onChange={updateField} placeholder="Rooms, materials, design notes..." className={`${fieldInputClass} min-h-28 resize-y`} /></FormField></div>
        <div className="flex justify-end lg:col-span-2"><Button disabled={saving || status !== "connected"}>{saving ? "Saving Project..." : "Save Project"}</Button></div>
      </form>
    </Card>
  </div>;
}
