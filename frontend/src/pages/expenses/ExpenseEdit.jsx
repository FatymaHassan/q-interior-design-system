import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import { categoryTypeLabel, createExpenseCategory, getExpenseCategories, getProjects, getSuppliers } from "../../services/api";
import { getExpense, updateExpense } from "./expenseApi";

const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

const emptyExpense = {
  project_id: "",
  supplier_id: "",
  category_id: "",
  title: "",
  category: "",
  paid_by: "",
  quantity: "1",
  unit_cost: "",
  total_cost: "",
  expense_date: "",
  payment_method: "cash",
  approval_status: "Approved",
  notes: "",
};

export default function ExpenseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "project_expense", description: "" });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getExpense(id), getProjects(), getSuppliers(), getExpenseCategories()])
      .then(([expense, projectData, supplierData, categoryData]) => {
        const raw = expense.raw || {};
        setProjects(projectData);
        setSuppliers(supplierData);
        setCategories(categoryData.filter((category) => category.type === "project_expense" && category.status === "Active"));
        setForm({
          project_id: raw.project_id || "",
          supplier_id: raw.supplier_id || "",
          category_id: raw.category_id || "",
          title: raw.title || raw.item_name || "",
          category: raw.category || "",
          paid_by: raw.paid_by || "",
          quantity: String(raw.quantity || 1),
          unit_cost: String(raw.unit_cost || raw.unit_price || ""),
          total_cost: String(raw.total_cost || raw.amount || ""),
          expense_date: raw.expense_date || "",
          payment_method: raw.payment_method || "cash",
          approval_status: raw.approval_status || "Approved",
          notes: raw.notes || "",
        });
        setStatus("connected");
      })
      .catch(() => setStatus("fallback"));
  }, [id]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "quantity" || name === "unit_cost") {
        next.total_cost = String(Number(next.quantity || 0) * Number(next.unit_cost || 0));
      }
      return next;
    });
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    await updateExpense(id, {
      ...form,
      project_id: form.project_id ? Number(form.project_id) : null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      quantity: Number(form.quantity || 0),
      unit_cost: Number(form.unit_cost || 0),
      total_cost: Number(form.total_cost || 0),
      amount: Number(form.total_cost || 0),
    });
    navigate("/expenses");
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const category = await createExpenseCategory({ ...categoryForm, status: "Active" });
    const categoryData = await getExpenseCategories({ status: "Active", type: "project_expense" });
    setCategories(categoryData);
    setForm((current) => ({ ...current, category_id: category.id }));
    setCategoryForm({ name: "", type: "project_expense", description: "" });
    setCategoryModalOpen(false);
  };

  return <div className="space-y-6">
    <div><Link to="/expenses"><Button variant="outline">Back to Expenses</Button></Link></div>
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Edit Expense</h2>
          <p className="text-sm text-brand-muted">Update project cost, approval state, supplier, and payment details.</p>
        </div>
      </div>
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">Could not load this expense. Please check the backend and try again.</p>}
      <form onSubmit={submitExpense} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} className={fieldInputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>
        <FormField label="Expense title"><input name="title" value={form.title} onChange={updateField} required className={fieldInputClass} /></FormField>
        <div>
          <FormField label="Category"><select name="category_id" value={form.category_id} onChange={updateField} className={fieldInputClass}><option value="">Manual category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
          <button type="button" onClick={() => setCategoryModalOpen(true)} className="mt-2 text-sm font-bold text-brand-primary">+ Add New Category</button>
        </div>
        <FormField label="Manual category"><input name="category" value={form.category} onChange={updateField} placeholder="Materials, labour, fuel..." className={fieldInputClass} /></FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Quantity"><input name="quantity" type="number" min="0" value={form.quantity} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Unit cost"><input name="unit_cost" type="number" min="0" value={form.unit_cost} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Total cost"><input name="total_cost" type="number" min="0" value={form.total_cost} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Approval status"><select name="approval_status" value={form.approval_status} onChange={updateField} className={fieldInputClass}><option>Pending</option><option>Approved</option><option>Rejected</option></select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><Button disabled={status !== "connected"}>Update Expense</Button></div>
      </form>
    </Card>
    <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Add Expense Category">
      <form onSubmit={saveCategory} className="space-y-4">
        <FormField label="Name"><input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} required className={fieldInputClass} /></FormField>
        <FormField label="Type"><select value={categoryForm.type} onChange={(event) => setCategoryForm((current) => ({ ...current, type: event.target.value }))} className={fieldInputClass}><option value="project_expense">{categoryTypeLabel("project_expense")}</option><option value="overhead">{categoryTypeLabel("overhead")}</option><option value="inventory">{categoryTypeLabel("inventory")}</option><option value="payroll">{categoryTypeLabel("payroll")}</option><option value="other">{categoryTypeLabel("other")}</option></select></FormField>
        <FormField label="Description"><textarea value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} rows="3" className={fieldInputClass} /></FormField>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button><Button>Save Category</Button></div>
      </form>
    </Modal>
  </div>;
}
