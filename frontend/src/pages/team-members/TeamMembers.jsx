import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import ActionButton from "../../components/ui/ActionButton";
import { createTeamMember, deleteTeamMember, getDepartments, getTeamMembers, updateTeamMember, updateTeamMemberStatus } from "../../services/api";

const emptyForm = { name: "", phone: "", email: "", position: "Worker", department_id: "", specialty: "", daily_rate: "", monthly_salary: "", status: "Active", notes: "" };
const positions = ["Project Manager", "Interior Designer", "Site Supervisor", "Carpenter", "Painter", "Electrician", "Installer", "Driver", "Worker", "Finance Staff", "Other"];

export default function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: "", position: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getTeamMembers(filters), getDepartments()])
      .then(([memberData, departmentData]) => {
        setMembers(memberData);
        setDepartments(departmentData);
      })
      .catch(() => setNotice("Could not load team members."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    active: members.filter((item) => item.status === "Active").length,
    inactive: members.filter((item) => item.status === "Inactive").length,
  }), [members]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, department_id: departments[0]?.id || "" });
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: member.name,
      phone: member.raw.phone || "",
      email: member.raw.email || "",
      position: member.raw.position || "Worker",
      department_id: member.raw.department_id || "",
      specialty: member.raw.specialty || "",
      daily_rate: member.raw.daily_rate || "",
      monthly_salary: member.raw.monthly_salary || "",
      status: member.status || "Active",
      notes: member.raw.notes || "",
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setNotice("");
    const payload = { ...form, department_id: form.department_id ? Number(form.department_id) : null };
    try {
      editing ? await updateTeamMember(editing.id, payload) : await createTeamMember(payload);
      setModalOpen(false);
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save team member.");
    }
  };

  const remove = async (member) => {
    if (!window.confirm(`Delete or deactivate ${member.name}?`)) return;
    await deleteTeamMember(member.id);
    load();
  };

  const applyFilters = (event) => {
    event.preventDefault();
    load();
  };

  return <div className="space-y-4">
    <PageHeader eyebrow="Project Team" title="Team Members" description="Create team profiles and assign saved people to interior design projects." action={<Button onClick={openCreate} className="gap-2"><Plus size={16} />Add Team Member</Button>} />

    {notice && <Card className="p-4 text-sm text-brand-danger">{notice}</Card>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Summary label="Total Team" value={members.length} />
      <Summary label="Active" value={totals.active} />
      <Summary label="Inactive" value={totals.inactive} />
    </section>

    <Card className="p-4">
      <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3">
          <Search size={17} className="text-brand-muted" />
          <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search team..." className="min-h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={filters.position} onChange={(event) => setFilters((current) => ({ ...current, position: event.target.value }))} className={fieldInputClass}><option value="">All positions</option>{positions.map((position) => <option key={position}>{position}</option>)}</select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}><option value="">All statuses</option><option>Active</option><option>Inactive</option></select>
        <Button>Filter</Button>
      </form>

      {loading ? <p className="text-sm text-brand-muted">Loading team members...</p> : <Table columns={[
        { key: "photo", label: "Photo", render: (member) => <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft font-black text-brand-primary">{member.name.slice(0, 1)}</div> },
        { key: "name", label: "Name", render: (member) => <b>{member.name}</b> },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "position", label: "Position" },
        { key: "specialty", label: "Specialty", render: (member) => member.specialty || "-" },
        { key: "status", label: "Status", render: (member) => <Badge>{member.status}</Badge> },
        { key: "actions", label: "Actions", render: (member) => <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => openEdit(member)}>Edit</ActionButton>
          <ActionButton onClick={() => updateTeamMemberStatus(member.id, member.status === "Active" ? "Inactive" : "Active").then(load)}>{member.status === "Active" ? "Deactivate" : "Activate"}</ActionButton>
          <ActionButton className="text-brand-danger" onClick={() => remove(member)}>Delete</ActionButton>
        </div> },
      ]} rows={members} empty="No team members found." />}
    </Card>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Team Member" : "Add Team Member"}>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Full name"><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className={fieldInputClass} /></FormField>
        <FormField label="Position"><select value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} className={fieldInputClass}>{positions.map((position) => <option key={position}>{position}</option>)}</select></FormField>
        <FormField label="Phone"><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Email"><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Department"><select value={form.department_id} onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))} className={fieldInputClass}><option value="">No department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></FormField>
        <FormField label="Skill / specialty"><input value={form.specialty} onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Daily rate"><input type="number" min="0" value={form.daily_rate} onChange={(event) => setForm((current) => ({ ...current, daily_rate: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Monthly salary"><input type="number" min="0" value={form.monthly_salary} onChange={(event) => setForm((current) => ({ ...current, monthly_salary: event.target.value }))} className={fieldInputClass} /></FormField>
        <FormField label="Status"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}><option>Active</option><option>Inactive</option></select></FormField>
        <FormField label="Notes" className="md:col-span-2"><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows="3" className={fieldInputClass} /></FormField>
        <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button>Save Team Member</Button></div>
      </form>
    </Modal>
  </div>;
}

function Summary({ label, value }) {
  return <Card className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p><b className="mt-1 block text-2xl text-brand-primary">{value}</b></Card>;
}
