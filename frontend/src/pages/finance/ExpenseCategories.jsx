import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import ActionButton from "../../components/ui/ActionButton";
import { createExpenseCategory, deleteExpenseCategory, getExpenseCategories, updateExpenseCategory, updateExpenseCategoryStatus } from "../../services/api";
import { FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection } from "./financeUi";

const emptyForm = { name: "", type: "project_expense", expense_type: "project", group_name: "", description: "", status: "Active" };

export default function ExpenseCategories() {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", group_name: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getExpenseCategories({ ...filters, expense_type: "project" })
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
    setForm({ name: category.name, type: "project_expense", expense_type: "project", group_name: category.groupName || "", description: category.description || "", status: category.status || "Active" });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      const payload = { ...form, group_name: form.group_name.trim(), name: form.name.trim(), type: "project_expense", expense_type: "project" };
      editing ? await updateExpenseCategory(editing.id, payload) : await createExpenseCategory(payload);
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
    <FinanceHeader eyebrow="Finance Setup" title="Expense Category Items" description="Create manual project expense categories and their items for Project Expense." action={<Button onClick={openCreate} className="gap-2"><Plus size={16} />Add Item</Button>} />

    {notice && <FinanceNotice tone="error">{notice}</FinanceNotice>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Total Items" value={categories.length} />
      <FinanceMetric label="Active" value={totals.active} />
      <FinanceMetric label="Inactive" value={totals.inactive} />
    </section>

    <FinanceSection title="Category List" subtitle="Filter project expense groups and activate or deactivate individual items.">
      <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_160px_auto]">
        <div className="flex h-11 items-center gap-2 rounded-lg border border-brand-border bg-white px-3">
          <Search size={17} className="text-brand-muted" />
          <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search items..." className="min-h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <input value={filters.group_name} onChange={(event) => setFilters((current) => ({ ...current, group_name: event.target.value }))} placeholder="Expense category" className={fieldInputClass} />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <Button>Filter</Button>
      </form>

      {loading ? <p className="text-sm text-brand-muted">Loading categories...</p> : <Table columns={[
        { key: "groupName", label: "Expense Category", render: (category) => <span className="font-semibold text-slate-900">{category.groupName || "Uncategorized"}</span> },
        { key: "name", label: "Item", render: (category) => <span className="font-bold text-brand-primary">{category.name}</span> },
        { key: "description", label: "Description", render: (category) => <span className="text-brand-muted">{category.description || "-"}</span> },
        { key: "status", label: "Status", render: (category) => <Badge>{category.status}</Badge> },
        { key: "createdAt", label: "Created" },
        { key: "actions", label: "Actions", render: (category) => <div className="flex flex-wrap justify-end gap-2">
          <ActionButton tone="edit" title="Edit item" aria-label="Edit item" onClick={() => openEdit(category)}><Pencil /></ActionButton>
          <ActionButton tone={category.status === "Active" ? "warning" : "approve"} title={category.status === "Active" ? "Deactivate item" : "Activate item"} aria-label={category.status === "Active" ? "Deactivate item" : "Activate item"} onClick={() => updateExpenseCategoryStatus(category.id, category.status === "Active" ? "Inactive" : "Active").then(load)}>
            {category.status === "Active" ? <XCircle /> : <CheckCircle2 />}
          </ActionButton>
          <ActionButton tone="delete" title="Delete item" aria-label="Delete item" onClick={() => remove(category)}><Trash2 /></ActionButton>
        </div> },
      ]} rows={categories} empty="No project expense items found." />}
    </FinanceSection>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Expense Item" : "Add Expense Item"}>
      <form onSubmit={save} className="space-y-4">
        <FormField label="Expense Category"><input value={form.group_name} onChange={(event) => setForm((current) => ({ ...current, group_name: event.target.value }))} required placeholder="Design Costs, Materials, Site Expenses..." className={fieldInputClass} /></FormField>
        <FormField label="Item"><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Transport, Paint, Carpenter..." className={fieldInputClass} /></FormField>
        <FormField label="Status"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}><option>Active</option><option>Inactive</option></select></FormField>
        <FormField label="Description"><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="3" className={fieldInputClass} /></FormField>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button>Save Category</Button></div>
      </form>
    </Modal>
  </div>;
}
