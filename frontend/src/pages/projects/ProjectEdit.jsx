import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { addProjectMember, getClients, getEmployees, getProjectMembers, getProjectStages, removeProjectMember } from "../../services/api";
import { toNumber } from "../../utils/numberFormat";
import { getProject, updateProject } from "./projectApi";

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
  payment_plan_type: "Deposit + Final Payment",
  deposit_percentage: "50",
  deposit_amount: "",
  payment_terms: "",
  actual_cost: "0",
  progress: "0",
  status: "Active",
  description: "",
};

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getProject(id), getClients(), getProjectStages(), getEmployees({ status: "Active" }), getProjectMembers(id)]).then(([project, clientData, stageData, employeeData, projectMemberData]) => {
      const raw = project.raw || {};
      setClients(clientData);
      setStages(stageData);
      setEmployees(employeeData);
      setProjectMembers(projectMemberData);
      setForm({
        client_id: raw.client_id || "",
        project_stage_id: raw.project_stage_id || "",
        name: raw.name || raw.project_name || "",
        location: raw.location || "",
        start_date: raw.start_date || "",
        end_date: raw.end_date || "",
        deadline: raw.deadline || "",
        budget: raw.budget || "",
        contract_amount: raw.contract_amount || raw.revenue || raw.budget || "",
        payment_plan_type: raw.payment_plan_type || "Deposit + Final Payment",
        deposit_percentage: raw.deposit_percentage || "50",
        deposit_amount: raw.deposit_amount || "",
        payment_terms: raw.payment_terms || "",
        actual_cost: raw.actual_cost || "0",
        progress: raw.progress || "0",
        status: raw.status || "Active",
        description: raw.description || "",
      });
      setStatus("connected");
    }).catch(() => {
      setNotice("Project could not be loaded.");
      setStatus("error");
    });
  }, [id]);

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
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      await updateProject(id, {
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
      });
      navigate("/projects");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not update project.");
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (employeeId) => {
    if (!employeeId) return;
    const employee = employees.find((member) => Number(member.id) === Number(employeeId));
    await addProjectMember(id, {
      employee_id: Number(employeeId),
      role_on_project: employee?.position || "Member",
      assigned_date: new Date().toISOString().slice(0, 10),
    });
    setProjectMembers(await getProjectMembers(id));
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.employee?.name || member.user?.name || "this member"} from this project?`)) return;
    await removeProjectMember(id, member.id);
    setProjectMembers(await getProjectMembers(id));
  };
  

  return <div className="space-y-6">
    <div><Link to="/projects"><Button variant="outline">Back to Projects</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Edit Project</h2>
      {notice && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} required disabled={status !== "connected"} className={fieldInputClass}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
        <FormField label="Stage"><select name="project_stage_id" value={form.project_stage_id} onChange={updateField} className={fieldInputClass}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></FormField>
        <FormField label="Project name"><input name="name" value={form.name} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Location"><input name="location" value={form.location} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Start date"><input name="start_date" type="date" value={form.start_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Due date"><input name="end_date" type="date" value={form.end_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Deadline"><input name="deadline" type="date" value={form.deadline} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Budget"><input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={updateField} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <h3 className="font-bold text-brand-primary">Project Payment Plan</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FormField label="Contract amount"><input name="contract_amount" type="number" min="0" step="0.01" value={form.contract_amount} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Payment plan type"><select name="payment_plan_type" value={form.payment_plan_type} onChange={updateContractField} className={fieldInputClass}><option>Full Payment</option><option>Deposit + Final Payment</option><option>Milestone Payments</option><option>Progress Payments</option><option>Custom Payment Plan</option></select></FormField>
            <FormField label="Deposit %"><input name="deposit_percentage" type="number" min="0" max="100" step="0.01" value={form.deposit_percentage} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Deposit amount"><input name="deposit_amount" type="number" min="0" step="0.01" value={form.deposit_amount} onChange={updateContractField} className={fieldInputClass} /></FormField>
            <FormField label="Payment terms" className="lg:col-span-2"><textarea name="payment_terms" value={form.payment_terms} onChange={updateContractField} rows="3" className={fieldInputClass} /></FormField>
          </div>
        </div>
        <FormField label="Current cost"><input name="actual_cost" type="number" min="0" step="0.01" value={form.actual_cost} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Progress %"><input name="progress" type="number" min="0" max="100" step="0.01" value={form.progress} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Active</option><option>Pending</option><option>Completed</option><option>Cancelled</option></select></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-bold text-brand-primary">Employee Assignment</h3><p className="text-sm text-brand-muted">Add or remove employees from Employee Directory for this project.</p></div>
            <Link to="/hr/employees/add"><Button type="button" variant="outline">Add Employee</Button></Link>
          </div>
          <select onChange={(event) => { addMember(event.target.value); event.target.value = ""; }} className={fieldInputClass}>
            <option value="">Select employee</option>
            {employees.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.position}{member.specialty ? ` (${member.specialty})` : ""}</option>)}
          </select>
          <div className="mt-3 space-y-2">
            {projectMembers.map((member) => <div key={member.id} className="flex flex-col gap-2 rounded-xl bg-brand-soft p-3 md:flex-row md:items-center md:justify-between">
              <div><b>{member.employee?.name || member.user?.name || "Team member"}</b><p className="text-sm text-brand-muted">{member.employee?.position || member.role_on_project || member.role || "Member"} {member.employee?.specialty ? `- ${member.employee.specialty}` : ""}</p></div>
              <Button type="button" variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeMember(member)}>Remove</Button>
            </div>)}
          </div>
        </div>
        <div className="lg:col-span-2"><FormField label="Project scope"><textarea name="description" value={form.description} onChange={updateField} className={`${fieldInputClass} min-h-28 resize-y`} /></FormField></div>
        <div className="flex justify-end lg:col-span-2"><Button disabled={saving || status !== "connected"}>{saving ? "Updating Project..." : "Update Project"}</Button></div>
      </form>
    </Card>
  </div>;
}
