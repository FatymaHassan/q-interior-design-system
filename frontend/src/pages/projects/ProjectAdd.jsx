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
  total_quotation: "",
  profit_percentage: "",
  contract_amount: "",
  payment_plan_type: "Deposit + Final Payment",
  deposit_percentage: "",
  deposit_amount: "",
  payment_terms: "",
  progress: "",
  status: "Active",
  notes: "",
};

export default function ProjectAdd() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const contractAmount = toNumber(form.contract_amount || form.total_quotation || form.budget);

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

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "total_quotation" || name === "profit_percentage") {
        const quote = toNumber(name === "total_quotation" ? value : next.total_quotation);
        const profit = toNumber(name === "profit_percentage" ? value : next.profit_percentage);
        next.contract_amount = quote > 0 ? Number((quote * (1 + (profit / 100))).toFixed(2)) : next.contract_amount;
      }
      if (name === "contract_amount" || name === "deposit_percentage") {
        const contract = toNumber(name === "contract_amount" ? value : next.contract_amount);
        const deposit = toNumber(name === "deposit_percentage" ? value : next.deposit_percentage);
        next.deposit_amount = contract > 0 && deposit > 0 ? Number(((contract * deposit) / 100).toFixed(2)) : "";
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const project = await createProject({
        ...form,
        client_id: Number(form.client_id),
        project_stage_id: form.project_stage_id ? Number(form.project_stage_id) : null,
        deadline: form.deadline || null,
        budget: toNumber(form.budget),
        total_quotation: toNumber(form.total_quotation || form.contract_amount || form.budget),
        profit_percentage: toNumber(form.profit_percentage),
        revenue: toNumber(form.total_quotation || form.contract_amount || form.budget),
        contract_amount: contractAmount,
        payment_plan_type: form.payment_plan_type,
        deposit_percentage: toNumber(form.deposit_percentage),
        deposit_amount: form.deposit_amount !== "" ? toNumber(form.deposit_amount) : Number(((contractAmount * toNumber(form.deposit_percentage)) / 100).toFixed(2)),
        payment_terms: form.payment_terms,
        progress: toNumber(form.progress),
        notes: form.notes,
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
      <h2 className="text-xl font-bold text-brand-primary">Add Project</h2>
      <p className="mt-1 text-sm text-brand-muted">Create the project, contract details, and employee assignment in one form.</p>
      {notice && <p className="mt-4 rounded-xl bg-brand-soft p-3 text-sm text-brand-primary">{notice}</p>}
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice || "Could not load project form data."}</p>}
      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormField label="Project name"><input name="name" value={form.name} onChange={updateField} required placeholder="Modern apartment redesign" className={fieldInputClass} /></FormField>
          <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} required disabled={status !== "connected"} className={fieldInputClass}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
          <FormField label="Location"><input name="location" value={form.location} onChange={updateField} placeholder="Mogadishu, Hodan..." className={fieldInputClass} /></FormField>
          <FormField label="Stage"><select name="project_stage_id" value={form.project_stage_id} onChange={updateField} className={fieldInputClass}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></FormField>
          <FormField label="Start date"><input name="start_date" type="date" value={form.start_date} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Due date"><input name="end_date" type="date" value={form.end_date} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Deadline"><input name="deadline" type="date" value={form.deadline} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Pending</option><option>Active</option><option>In Progress</option><option>Delayed</option><option>Completed</option><option>Cancelled</option></select></FormField>
        </section>

        <section className="rounded-2xl border border-brand-border p-4">
          <div className="mb-4">
            <h3 className="font-bold text-brand-primary">Contract Details</h3>
            <p className="text-sm text-brand-muted">Save the contract value, deposit, and payment terms directly on the project.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Budget"><input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={updateField} required placeholder="5000" className={fieldInputClass} /></FormField>
            <FormField label="Total quotation"><input name="total_quotation" type="number" min="0" step="0.01" value={form.total_quotation} onChange={updateField} placeholder="10000" className={fieldInputClass} /></FormField>
            <FormField label="Profit %"><input name="profit_percentage" type="number" min="0" step="0.01" value={form.profit_percentage} onChange={updateField} className={fieldInputClass} /></FormField>
            <FormField label="Contract amount"><input name="contract_amount" type="number" min="0" step="0.01" value={form.contract_amount} onChange={updateField} required placeholder="10000" className={fieldInputClass} /></FormField>
            <FormField label="Payment plan type"><select name="payment_plan_type" value={form.payment_plan_type} onChange={updateField} className={fieldInputClass}><option>Full Payment</option><option>Deposit + Final Payment</option><option>Milestone Payments</option><option>Progress Payments</option><option>Custom Payment Plan</option></select></FormField>
            <FormField label="Deposit %"><input name="deposit_percentage" type="number" min="0" max="100" step="0.01" value={form.deposit_percentage} onChange={updateField} className={fieldInputClass} /></FormField>
            <FormField label="Deposit amount"><input name="deposit_amount" type="number" min="0" step="0.01" value={form.deposit_amount} onChange={updateField} className={fieldInputClass} /></FormField>
            <FormField label="Progress %"><input name="progress" type="number" min="0" max="100" step="0.01" value={form.progress} onChange={updateField} className={fieldInputClass} /></FormField>
          </div>
          <div className="mt-4">
            <FormField label="Payment terms"><textarea name="payment_terms" value={form.payment_terms} onChange={updateField} className={`${fieldInputClass} min-h-24 resize-y`} /></FormField>
          </div>
        </section>

        <section className="rounded-2xl border border-brand-border p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-bold text-brand-primary">Employee Assignment</h3><p className="text-sm text-brand-muted">Optional team members for this project.</p></div>
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
        </section>

        <FormField label="Notes"><textarea name="notes" value={form.notes} onChange={updateField} placeholder="Contract notes, scope, or project remarks..." className={`${fieldInputClass} min-h-28 resize-y`} /></FormField>
        <div className="flex justify-end"><Button disabled={saving || status !== "connected"}>{saving ? "Saving Project..." : "Save Project"}</Button></div>
      </form>
    </Card>
  </div>;
}
