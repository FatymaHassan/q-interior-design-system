import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { addProjectMember, getClients, getEmployees, getProjectStages } from "../../services/api";
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
  payment_plan_type: "Progress Payments",
  deposit_percentage: "50",
  deposit_amount: "",
  payment_terms: "50% advance, 30% at 30% progress, 20% on completion",
  actual_cost: "0",
  progress: "0",
  status: "Active",
  description: "",
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
      const amount = Number(name === "contract_amount" ? value : next.contract_amount || next.budget || 0);
      const percent = Number(name === "deposit_percentage" ? value : next.deposit_percentage || 0);
      if (name === "contract_amount" || name === "deposit_percentage") {
        next.deposit_amount = amount ? String(((amount * percent) / 100).toFixed(2)) : "";
      }
      if (name === "contract_amount" && !next.budget) next.budget = value;
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
        budget: Number(form.budget || 0),
        contract_amount: Number(form.contract_amount || form.budget || 0),
        payment_plan_type: form.payment_plan_type,
        deposit_percentage: Number(form.deposit_percentage || 0),
        deposit_amount: Number(form.deposit_amount || 0),
        payment_terms: form.payment_terms,
        actual_cost: Number(form.actual_cost || 0),
        progress: Number(form.progress || 0),
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
        <FormField label="Budget"><input name="budget" type="number" min="0" value={form.budget} onChange={updateField} required placeholder="5000" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <h3 className="font-bold text-brand-primary">Project Payment Plan</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField label="Contract amount"><input name="contract_amount" type="number" min="0" step="0.01" value={form.contract_amount} onChange={updateContractField} required placeholder="10000" className={fieldInputClass} /></FormField>
            <FormField label="Payment plan type"><select name="payment_plan_type" value={form.payment_plan_type} onChange={updateContractField} className={fieldInputClass}><option>Full Payment</option><option>Deposit + Final Payment</option><option>Milestone Payments</option><option>Progress Payments</option><option>Custom Payment Plan</option></select></FormField>
            <FormField label="Deposit %"><input name="deposit_percentage" type="number" min="0" max="100" step="0.01" value={form.deposit_percentage} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Deposit amount"><input name="deposit_amount" type="number" min="0" step="0.01" value={form.deposit_amount} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Payment terms" className="lg:col-span-2"><textarea name="payment_terms" value={form.payment_terms} onChange={updateContractField} rows="3" className={fieldInputClass} /></FormField>
          </div>
        </div>
        <FormField label="Current cost"><input name="actual_cost" type="number" min="0" value={form.actual_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Progress %"><input name="progress" type="number" min="0" max="100" value={form.progress} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
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
