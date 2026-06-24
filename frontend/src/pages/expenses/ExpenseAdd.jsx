import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Modal from "../../components/ui/Modal";
import { categoryTypeLabel, createExpenseCategory, getExpenseCategories, getProjects, getSuppliers } from "../../services/api";
import { createExpense } from "./expenseApi";

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
  notes: "",
};

export default function ExpenseAdd() { 
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "project_expense", description: "" });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getProjects(), getSuppliers(), getExpenseCategories()]).then(([projectData, supplierData, categoryData]) => {
      const projectCategories = categoryData.filter((category) => category.type === "project_expense" && category.status === "Active");
      setProjects(projectData);
      setSuppliers(supplierData);
      setCategories(projectCategories);
      setForm((current) => ({ ...current, project_id: projectData[0]?.id || "", supplier_id: supplierData[0]?.id || "", category_id: projectCategories[0]?.id || "" }));
      setStatus("connected");
    }).catch(() => setStatus("fallback"));
  }, []);

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
    await createExpense({
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
      <h2 className="text-xl font-bold">Add Expense</h2>
      <p className="text-sm text-brand-muted">Record project costs with supplier, category, payment, and approval tracking.</p>
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">Could not load form data. Please login again or check the backend.</p>}
      <form onSubmit={submitExpense} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} className={fieldInputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>
        <FormField label="Expense title"><input name="title" value={form.title} onChange={updateField} required placeholder="Gypsum ceiling materials" className={fieldInputClass} /></FormField>
        <div>
          <FormField label="Category"><select name="category_id" value={form.category_id} onChange={updateField} className={fieldInputClass}><option value="">Manual category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
          <button type="button" onClick={() => setCategoryModalOpen(true)} className="mt-2 text-sm font-bold text-brand-primary">+ Add New Category</button>
        </div>
        <FormField label="Manual category"><input name="category" value={form.category} onChange={updateField} placeholder="Materials, labour, fuel..." className={fieldInputClass} /></FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Cashier, admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Quantity"><input name="quantity" type="number" min="0" value={form.quantity} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Unit cost"><input name="unit_cost" type="number" min="0" value={form.unit_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Total cost"><input name="total_cost" type="number" min="0" value={form.total_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><Button disabled={status !== "connected"}>Save Expense</Button></div>
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
