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
import { categoryTypeLabel, createExpenseCategory, deleteExpenseCategory, getExpenseCategories, updateExpenseCategory, updateExpenseCategoryStatus } from "../../services/api";

const emptyForm = { name: "", type: "project_expense", description: "", status: "Active" };
const categoryTypes = ["project_expense", "overhead", "inventory", "payroll", "other"];

export default function ExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", type: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getExpenseCategories(filters)
      .then(setCategories)
      .catch(() => setNotice("Could not load expense categories."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    active: categories.filter((item) => item.status === "Active").length,
    inactive: categories.filter((item) => item.status === "Inactive").length,
  }), [categories]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({ name: category.name, type: category.type || "project_expense", description: category.description || "", status: category.status || "Active" });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      editing ? await updateExpenseCategory(editing.id, form) : await createExpenseCategory(form);
      setModalOpen(false);
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save category. Check duplicate names under the same type.");
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete or deactivate ${category.name}?`)) return;
    await deleteExpenseCategory(category.id);
    load();
  };

  const applyFilters = (event) => {
    event.preventDefault();
    load();
  };

  return <div className="space-y-4">
    <PageHeader eyebrow="Finance Setup" title="Expense Categories" description="Manage reusable categories for project expenses, overheads, inventory, payroll, and other costs." action={<Button onClick={openCreate} className="gap-2"><Plus size={16} />Add Category</Button>} />

    {notice && <Card className="p-4 text-sm text-brand-danger">{notice}</Card>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Summary label="Total Categories" value={categories.length} />
      <Summary label="Active" value={totals.active} />
      <Summary label="Inactive" value={totals.inactive} />
    </section>

    <Card className="p-4">
      <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3">
          <Search size={17} className="text-brand-muted" />
          <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search categories..." className="min-h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className={fieldInputClass}>
          <option value="">All types</option>
          {categoryTypes.map((type) => <option key={type} value={type}>{categoryTypeLabel(type)}</option>)}
        </select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <Button>Filter</Button>
      </form>

      {loading ? <p className="text-sm text-brand-muted">Loading categories...</p> : <Table columns={[
        { key: "name", label: "Name", render: (category) => <b>{category.name}</b> },
        { key: "type", label: "Type", render: (category) => <Badge>{category.typeLabel}</Badge> },
        { key: "description", label: "Description", render: (category) => category.description || "-" },
        { key: "status", label: "Status", render: (category) => <Badge>{category.status}</Badge> },
        { key: "createdAt", label: "Created" },
        { key: "actions", label: "Actions", render: (category) => <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => openEdit(category)}>Edit</ActionButton>
          <ActionButton onClick={() => updateExpenseCategoryStatus(category.id, category.status === "Active" ? "Inactive" : "Active").then(load)}>{category.status === "Active" ? "Deactivate" : "Activate"}</ActionButton>
          <ActionButton className="text-brand-danger" onClick={() => remove(category)}>Delete</ActionButton>
        </div> },
      ]} rows={categories} empty="No expense categories found." />}
    </Card>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
      <form onSubmit={save} className="space-y-4">
        <FormField label="Category name"><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className={fieldInputClass} /></FormField>
        <FormField label="Type"><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className={fieldInputClass}>{categoryTypes.map((type) => <option key={type} value={type}>{categoryTypeLabel(type)}</option>)}</select></FormField>
        <FormField label="Status"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}><option>Active</option><option>Inactive</option></select></FormField>
        <FormField label="Description"><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="3" className={fieldInputClass} /></FormField>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button>Save Category</Button></div>
      </form>
    </Modal>
  </div>;
}

function Summary({ label, value }) {
  return <Card className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p><b className="mt-1 block text-2xl text-brand-primary">{value}</b></Card>;
}
