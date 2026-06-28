import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getExpenseCategories, getProjects, getSuppliers } from "../../services/api";
import { getExpense, updateExpense } from "./expenseApi";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";

const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

const emptyExpense = {
  expense_type: "project",
  project_id: "",
  supplier_id: "",
  title: "",
  category: "",
  category_id: "",
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
  const [expenseItems, setExpenseItems] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getExpense(id), getProjects(), getSuppliers(), getExpenseCategories({ expense_type: "project", status: "Active" })])
      .then(([expense, projectData, supplierData, categoryData]) => {
        const raw = expense.raw || {};
        const savedCategory = raw.category_model?.group_name || raw.category || "";
        const savedItem = raw.category_id
          ? categoryData.find((item) => Number(item.id) === Number(raw.category_id))
          : null;
        setProjects(projectData);
        setSuppliers(supplierData);
        setExpenseItems(categoryData);
        setForm({
          expense_type: "project",
          project_id: raw.project_id || "",
          supplier_id: raw.supplier_id || "",
          title: savedItem?.name || raw.title || raw.item_name || "",
          category: savedItem?.groupName || savedCategory,
          category_id: raw.category_id || savedItem?.id || "",
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

  const categoryOptions = Array.from(new Set(expenseItems.map((item) => item.groupName || "Uncategorized"))).filter(Boolean);
  const filteredItems = expenseItems.filter((item) => (item.groupName || "Uncategorized") === form.category);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "category") {
        next.title = "";
        next.category_id = "";
      }
      if (name === "category_id") {
        const selected = expenseItems.find((item) => String(item.id) === String(value));
        next.category = selected?.groupName || "";
        next.title = selected?.name || "";
      }
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
      expense_type: "project",
      project_id: form.project_id ? Number(form.project_id) : null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      employee_id: null,
      category_id: form.category_id ? Number(form.category_id) : null,
      category: form.category,
      quantity: Number(form.quantity || 0),
      unit_cost: Number(form.unit_cost || 0),
      total_cost: Number(form.total_cost || 0),
      amount: Number(form.total_cost || 0),
      is_manual_total: Number(form.total_cost || 0) !== Number(form.quantity || 0) * Number(form.unit_cost || 0),
    });
    navigate("/expenses");
  };

  const totalCost = Number(form.total_cost || 0);

  return <div className="space-y-6">
    <FinanceHeader
      title="Edit Expense"
      description="Update a project expense used for project profit tracking."
      backTo="/expenses"
      backLabel="Back to Expenses"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Category" value={form.category || "Not set"} />
      <FinanceMetric label="Approval" value={form.approval_status || "Approved"} />
      <FinanceMetric label="Total Cost" value={money(totalCost)} />
    </section>
    <FinanceSection title="Expense Form" subtitle="Adjust project, supplier, category item, approval, and payment details.">
      {status === "fallback" && <FinanceNotice tone="error">Could not load this expense. Please check the backend and try again.</FinanceNotice>}
      <form onSubmit={submitExpense} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>
        <FormField label="Expense category">
          <select name="category" value={form.category} onChange={updateField} required className={fieldInputClass}>
            <option value="">Select expense category</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </FormField>
        <FormField label="Expense item">
          <select name="category_id" value={form.category_id} onChange={updateField} required disabled={!form.category || filteredItems.length === 0} className={fieldInputClass}>
            <option value="">{form.category ? "Select expense item" : "Select category first"}</option>
            {filteredItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Quantity"><input name="quantity" type="number" min="0" value={form.quantity} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Unit cost"><input name="unit_cost" type="number" min="0" value={form.unit_cost} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Total cost"><input name="total_cost" type="number" min="0" value={form.total_cost} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Approval status"><select name="approval_status" value={form.approval_status} onChange={updateField} className={fieldInputClass}><option>Pending</option><option>Approved</option><option>Rejected</option></select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/expenses" submitLabel="Update Expense" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
