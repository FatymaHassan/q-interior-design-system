import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import Table from "../../components/ui/Table";
import { addProjectMember, createDocument, createTeamMember, deleteDocument, downloadDocumentFile, getDepartments, getMaterials, getProjectMaterialsUsed, getProjectMembers, getProjectTimeline, getTeamMembers, removeProjectMember, stockOutMaterial, updateDocument } from "../../services/api";
import { getProject } from "./projectApi";

const tabs = ["Overview", "Tasks", "Documents", "Timeline", "Team", "Materials Used", "Client Messages", "Approvals"];

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsUsed, setMaterialsUsed] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [memberForm, setMemberForm] = useState({ employee_id: "", role_on_project: "Member", assigned_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", phone: "", email: "", position: "Worker", department_id: "", specialty: "", status: "Active" });
  const [docForm, setDocForm] = useState({ title: "", document_category: "Photo", visibility: "internal", file: null });
  const [editingDocument, setEditingDocument] = useState(null);
  const [materialForm, setMaterialForm] = useState({ material_id: "", quantity: 1, unit_cost: "", notes: "" });
  const [status, setStatus] = useState("loading");

  const loadProject = () => Promise.all([getProject(id), getTeamMembers({ status: "Active" }), getProjectMembers(id), getProjectTimeline(id), getMaterials(), getProjectMaterialsUsed(id), getDepartments()])
    .then(([data, memberData, projectMemberData, timelineData, materialData, materialsUsedData, departmentData]) => {
      setProject(data);
      setTeamMembers(memberData);
      setProjectMembers(projectMemberData);
      setTimeline(timelineData.items || []);
      setMaterials(materialData);
      setMaterialsUsed(materialsUsedData.movements || []);
      setDepartments(departmentData);
      setMemberForm((current) => ({ ...current, employee_id: current.employee_id || memberData[0]?.id || "" }));
      setMaterialForm((current) => ({
        ...current,
        material_id: current.material_id || materialData[0]?.id || "",
        unit_cost: current.unit_cost || materialData[0]?.purchasePrice || "",
      }));
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => {
    loadProject();
  }, [id]);

  const raw = project?.raw || {};
  const members = useMemo(() => projectMembers.length ? projectMembers : raw.members || [], [projectMembers, raw.members]);
  const documents = useMemo(() => raw.documents || [], [raw.documents]);
  const tasks = useMemo(() => raw.tasks || [], [raw.tasks]);
  const messages = useMemo(() => raw.client_messages || [], [raw.client_messages]);
  const approvals = useMemo(() => raw.approvals || [], [raw.approvals]);

  const addMember = async (event) => {
    event.preventDefault();
    await addProjectMember(id, {
      employee_id: Number(memberForm.employee_id),
      role_on_project: memberForm.role_on_project,
      assigned_date: memberForm.assigned_date,
      notes: memberForm.notes,
    });
    loadProject();
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.employee?.name || member.user?.name || "this member"} from the project?`)) return;
    await removeProjectMember(id, member.id);
    loadProject();
  };

  const saveTeamMember = async (event) => {
    event.preventDefault();
    const member = await createTeamMember({ ...teamForm, department_id: teamForm.department_id ? Number(teamForm.department_id) : null });
    setTeamMembers(await getTeamMembers({ status: "Active" }));
    setMemberForm((current) => ({ ...current, employee_id: member.id }));
    setTeamForm({ name: "", phone: "", email: "", position: "Worker", department_id: "", specialty: "", status: "Active" });
    setTeamModalOpen(false);
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!docForm.title || (!editingDocument && !docForm.file)) return;
    const form = new FormData();
    form.append("project_id", id);
    form.append("title", docForm.title);
    form.append("document_category", docForm.document_category);
    form.append("visibility", docForm.visibility);
    if (docForm.file) form.append("file", docForm.file);
    if (editingDocument) {
      await updateDocument(editingDocument.id, form);
    } else {
      await createDocument(form);
    }
    setEditingDocument(null);
    setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
    event.target.reset();
    loadProject();
  };

  const editDocument = (document) => {
    setEditingDocument(document);
    setDocForm({
      title: document.title,
      document_category: document.document_category || "Other",
      visibility: document.visibility || "internal",
      file: null,
    });
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Delete "${document.title}"?`)) return;
    await deleteDocument(document.id);
    if (editingDocument?.id === document.id) {
      setEditingDocument(null);
      setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
    }
    loadProject();
  };

  const addProjectMaterial = async (event) => {
    event.preventDefault();
    if (!materialForm.material_id) return;
    const selected = materials.find((material) => Number(material.id) === Number(materialForm.material_id));
    await stockOutMaterial(materialForm.material_id, {
      project_id: Number(id),
      quantity: Number(materialForm.quantity || 0),
      unit_cost: Number(materialForm.unit_cost || selected?.purchasePrice || 0),
      notes: materialForm.notes,
    });
    setMaterialForm((current) => ({ ...current, quantity: 1, notes: "" }));
    loadProject();
  };

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading project...</Card>;
  if (status === "error" || !project) return <Card className="p-5 text-sm text-brand-danger">Project could not be loaded.</Card>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/projects"><Button variant="outline">Back to Projects</Button></Link>
      <Link to={`/projects/${project.id}/edit`}><Button>Edit Project</Button></Link>
    </div>

    <Card className="p-5 md:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">Project Details</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-brand-primary">{project.name}</h2>
          <p className="mt-2 text-sm text-brand-muted">{raw.description || raw.notes || "No notes added yet."}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Badge>{project.stage}</Badge><Badge>{project.status}</Badge></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Client" value={project.client} />
          <Metric label="Location" value={project.location} />
          <Metric label="Start Date" value={raw.start_date || "-"} />
          <Metric label="Deadline" value={project.deadline} />
          <Metric label="Budget" value={`$${Number(project.budget || 0).toLocaleString()}`} />
          <Metric label="Budget Used" value={`$${Number(raw.actual_cost || 0).toLocaleString()}`} />
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm"><span>Progress</span><b>{project.progress}%</b></div>
        <ProgressBar value={project.progress} />
      </div>
    </Card>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => <Button key={tab} variant={activeTab === tab ? "primary" : "outline"} className="whitespace-nowrap px-4 py-2" onClick={() => setActiveTab(tab)}>{tab}</Button>)}
    </div>

    {activeTab === "Overview" && <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5"><h3 className="mb-4 font-bold">Client Information</h3><InfoRows rows={[["Name", raw.client?.name], ["Phone", raw.client?.phone], ["Email", raw.client?.email], ["Address", raw.client?.address || raw.client?.location]]} /></Card>
      <Card className="p-5"><h3 className="mb-4 font-bold">Notes</h3><p className="text-sm text-brand-muted">{raw.notes || raw.description || "No notes added."}</p></Card>
    </section>}

    {activeTab === "Tasks" && <Card className="p-5">
      <Table columns={[
        { key: "title", label: "Task", render: (task) => <Link to={`/tasks/${task.id}`} className="font-bold text-brand-primary hover:underline">{task.title}</Link> },
        { key: "assignee", label: "Assigned", render: (task) => task.assignee?.name || "-" },
        { key: "priority", label: "Priority", render: (task) => <Badge>{task.priority}</Badge> },
        { key: "status", label: "Status", render: (task) => <Badge>{task.status}</Badge> },
        { key: "deadline", label: "Deadline" },
      ]} rows={tasks} empty="No daily tasks for this project yet." />
    </Card>}

    {activeTab === "Documents" && <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-bold">{editingDocument ? "Edit Project Document" : "Upload Project Document"}</h3>
        {editingDocument && <Button type="button" variant="outline" onClick={() => {
          setEditingDocument(null);
          setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
        }}>Cancel Edit</Button>}
      </div>
      <form onSubmit={uploadDocument} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_160px_1fr_auto]">
        <input value={docForm.title} onChange={(event) => setDocForm((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" className={fieldInputClass} />
        <select value={docForm.document_category} onChange={(event) => setDocForm((current) => ({ ...current, document_category: event.target.value }))} className={fieldInputClass}><option>Photo</option><option>Design File</option><option>Contract</option><option>Receipt</option><option>Invoice</option><option>Other</option></select>
        <select value={docForm.visibility} onChange={(event) => setDocForm((current) => ({ ...current, visibility: event.target.value }))} className={fieldInputClass}><option value="internal">Internal</option><option value="client">Client</option></select>
        <input type="file" onChange={(event) => setDocForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} className={fieldInputClass} />
        <Button disabled={!docForm.title || (!editingDocument && !docForm.file)}>{editingDocument ? "Save" : "Upload"}</Button>
      </form>
      <Table columns={[
        { key: "title", label: "Title", render: (document) => <b>{document.title}</b> },
        { key: "document_category", label: "Category" },
        { key: "visibility", label: "Visibility", render: (document) => <Badge>{document.visibility}</Badge> },
        { key: "file_path", label: "File", render: (document) => document.file_path ? <button type="button" onClick={() => downloadDocumentFile(document)} className="font-semibold text-brand-primary underline">Download</button> : "-" },
        { key: "actions", label: "Actions", render: (document) => <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => editDocument(document)} className="font-semibold text-brand-primary underline">Edit</button>
          <button type="button" onClick={() => removeDocument(document)} className="font-semibold text-brand-danger underline">Delete</button>
        </div> },
      ]} rows={documents} empty="No documents uploaded for this project yet." />
    </Card>}

    {activeTab === "Timeline" && <Card className="p-5">
      <h3 className="mb-4 font-bold">Project Timeline</h3>
      <div className="space-y-3">
        {timeline.map((item, index) => <div key={`${item.type}-${index}`} className="flex gap-3 rounded-2xl border border-brand-border p-4">
          <div className="mt-1 h-3 w-3 rounded-full bg-brand-gold" />
          <div><b>{item.title}</b><p className="text-sm text-brand-muted">{item.type} - {item.status} - {item.date ? new Date(item.date).toLocaleString() : "-"}</p></div>
        </div>)}
        {timeline.length === 0 && <p className="text-sm text-brand-muted">No timeline events yet.</p>}
      </div>
    </Card>}

    {activeTab === "Team" && <Card className="p-5">
      <form onSubmit={addMember} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <FormField label="Member"><select value={memberForm.employee_id} onChange={(event) => setMemberForm((current) => ({ ...current, employee_id: event.target.value }))} className={fieldInputClass}>{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.position}</option>)}</select><button type="button" onClick={() => setTeamModalOpen(true)} className="mt-2 text-sm font-bold text-brand-primary">+ Add New Team Member</button></FormField>
        <FormField label="Role on project"><input value={memberForm.role_on_project} onChange={(event) => setMemberForm((current) => ({ ...current, role_on_project: event.target.value }))} className={fieldInputClass} /></FormField>
        <div className="flex items-end"><Button disabled={!memberForm.employee_id}>Add</Button></div>
      </form>
      <Table columns={[
        { key: "member", label: "Member", render: (member) => <b>{member.employee?.name || member.user?.name || "-"}</b> },
        { key: "position", label: "Position", render: (member) => member.employee?.position || "-" },
        { key: "role", label: "Project Role", render: (member) => member.role_on_project || member.role || "-" },
        { key: "phone", label: "Phone", render: (member) => member.employee?.phone || "-" },
        { key: "assigned", label: "Assigned", render: (member) => member.assigned_date || member.assigned_at || "-" },
        { key: "status", label: "Status", render: (member) => <Badge>{member.employee?.status || "Active"}</Badge> },
        { key: "actions", label: "Actions", render: (member) => <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeMember(member)}>Remove</Button> },
      ]} rows={members} empty="No team members assigned yet." />
    </Card>}

    {activeTab === "Materials Used" && <Card className="p-5">
      <h3 className="mb-4 font-bold">Project Materials Used</h3>
      <form onSubmit={addProjectMaterial} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_140px_140px_1fr_auto]">
        <select value={materialForm.material_id} onChange={(event) => {
          const selected = materials.find((material) => Number(material.id) === Number(event.target.value));
          setMaterialForm((current) => ({ ...current, material_id: event.target.value, unit_cost: selected?.purchasePrice || current.unit_cost }));
        }} className={fieldInputClass}>
          {materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.currentStock} {material.unit})</option>)}
        </select>
        <input type="number" min="0.01" step="0.01" value={materialForm.quantity} onChange={(event) => setMaterialForm((current) => ({ ...current, quantity: event.target.value }))} className={fieldInputClass} />
        <input type="number" min="0" step="0.01" value={materialForm.unit_cost} onChange={(event) => setMaterialForm((current) => ({ ...current, unit_cost: event.target.value }))} className={fieldInputClass} />
        <input placeholder="Notes" value={materialForm.notes} onChange={(event) => setMaterialForm((current) => ({ ...current, notes: event.target.value }))} className={fieldInputClass} />
        <Button disabled={!materialForm.material_id}>Add Usage</Button>
      </form>
      <Table columns={[
        { key: "material", label: "Material", render: (movement) => <b>{movement.material?.name || "-"}</b> },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit", render: (movement) => movement.material?.unit || "-" },
        { key: "unit_cost", label: "Unit Cost", render: (movement) => `$${Number(movement.unit_cost || 0).toLocaleString()}` },
        { key: "total_cost", label: "Total", render: (movement) => `$${Number(movement.total_cost || 0).toLocaleString()}` },
        { key: "movement_date", label: "Date" },
        { key: "created_by", label: "Created By", render: (movement) => movement.creator?.name || "-" },
        { key: "notes", label: "Notes" },
      ]} rows={materialsUsed} empty="No materials recorded for this project yet." />
    </Card>}

    {activeTab === "Client Messages" && <Card className="p-5">
      <div className="space-y-3">
        {messages.map((message) => <div key={message.id} className="rounded-2xl border border-brand-border p-4 text-sm"><b>{message.sender_type === "client" ? raw.client?.name : message.user?.name || "Staff"}</b><p className="mt-1 text-brand-muted">{message.message}</p></div>)}
        {messages.length === 0 && <p className="text-sm text-brand-muted">No client messages yet.</p>}
      </div>
    </Card>}

    {activeTab === "Approvals" && <Card className="p-5">
      <div className="space-y-3">
        {approvals.map((approval) => <div key={approval.id} className="rounded-2xl bg-brand-soft p-4 text-sm"><div className="flex justify-between gap-3"><b>{approval.title}</b><Badge>{approval.status}</Badge></div><p className="mt-1 text-brand-muted">{approval.description}</p></div>)}
        {approvals.length === 0 && <p className="text-sm text-brand-muted">No client approvals yet.</p>}
      </div>
    </Card>}
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

function Metric({ label, value }) {
  return <div className="rounded-2xl bg-brand-soft p-4"><span className="text-brand-muted">{label}</span><b className="mt-1 block">{value || "-"}</b></div>;
}

function InfoRows({ rows }) {
  return <div className="space-y-3 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between rounded-xl bg-brand-soft p-3"><span>{label}</span><b>{value || "-"}</b></div>)}</div>;
}
