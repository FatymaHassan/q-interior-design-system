import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import { addProjectMember, createTeamMember, getClients, getDepartments, getProjectStages, getTeamMembers } from "../../services/api";
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
  actual_cost: "0",
  progress: "0",
  status: "Active",
  description: "",
};

export default function ProjectAdd() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stages, setStages] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", phone: "", email: "", position: "Worker", department_id: "", specialty: "", daily_rate: "", monthly_salary: "", status: "Active", notes: "" });
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getClients(), getProjectStages(), getTeamMembers({ status: "Active" }), getDepartments()]).then(([clientData, stageData, memberData, departmentData]) => {
      setClients(clientData);
      setStages(stageData);
      setTeamMembers(memberData);
      setDepartments(departmentData);
      setForm((current) => ({ ...current, client_id: clientData[0]?.id || "", project_stage_id: stageData[0]?.id || "" }));
      setStatus("connected");
    }).catch((error) => {
      setNotice(error.response?.status === 401 ? "Your session expired. Please login again." : "Could not load clients. Check that the backend is running.");
      setStatus("fallback");
    });
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

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
    const employee = teamMembers.find((member) => Number(member.id) === Number(employeeId));
    setSelectedMembers((current) => [...current, { employee_id: employeeId, name: employee?.name || "Team member", role_on_project: employee?.position || "Member", assigned_date: new Date().toISOString().slice(0, 10), notes: "" }]);
  };

  const saveTeamMember = async (event) => {
    event.preventDefault();
    const member = await createTeamMember({ ...teamForm, department_id: teamForm.department_id ? Number(teamForm.department_id) : null });
    const memberData = await getTeamMembers({ status: "Active" });
    setTeamMembers(memberData);
    addSelectedMember(member.id);
    setTeamForm({ name: "", phone: "", email: "", position: "Worker", department_id: "", specialty: "", daily_rate: "", monthly_salary: "", status: "Active", notes: "" });
    setTeamModalOpen(false);
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
        <FormField label="Current cost"><input name="actual_cost" type="number" min="0" value={form.actual_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Progress %"><input name="progress" type="number" min="0" max="100" value={form.progress} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Active</option><option>Pending</option><option>Completed</option><option>Cancelled</option></select></FormField>
        <div className="lg:col-span-2 rounded-2xl border border-brand-border p-4">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h3 className="font-bold text-brand-primary">Team Assignment</h3><p className="text-sm text-brand-muted">Select saved team members and define their project roles.</p></div>
            <Button type="button" variant="outline" onClick={() => setTeamModalOpen(true)}>+ Add New Team Member</Button>
          </div>
          <select onChange={(event) => { addSelectedMember(event.target.value); event.target.value = ""; }} className={fieldInputClass}>
            <option value="">Select team member</option>
            {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.position}{member.specialty ? ` (${member.specialty})` : ""}</option>)}
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
    <Modal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} title="Add Team Member">
      <form onSubmit={saveTeamMember} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Full name"><input value={teamForm.name} onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))} required className={fieldInputClass} /></FormField>
        <FormField label="Position"><input value={teamForm.position} onChange={(event) => setTeamForm((current) => ({ ...current, position: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Phone"><input value={teamForm.phone} onChange={(event) => setTeamForm((current) => ({ ...current, phone: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Email"><input type="email" value={teamForm.email} onChange={(event) => setTeamForm((current) => ({ ...current, email: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Department"><select value={teamForm.department_id} onChange={(event) => setTeamForm((current) => ({ ...current, department_id: event.target.value }))} className={fieldInputClass}><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></FormField>
        <FormField label="Specialty"><input value={teamForm.specialty} onChange={(event) => setTeamForm((current) => ({ ...current, specialty: event.target.value }))} className={fieldInputClass} /></FormField>
        <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={() => setTeamModalOpen(false)}>Cancel</Button><Button>Save Team Member</Button></div>
      </form>
    </Modal>
  </div>;
}
