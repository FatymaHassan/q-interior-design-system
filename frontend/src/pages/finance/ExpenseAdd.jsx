import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getExpenseCategories, getProjects, getSuppliers } from "../../services/api";
import { toNumber } from "../../utils/numberFormat";
import { createExpense } from "./expenseApi";
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
  notes: "",
};

export default function ExpenseAdd() { 
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getProjects(), getSuppliers(), getExpenseCategories({ expense_type: "project", status: "Active" })]).then(([projectData, supplierData, categoryData]) => {
      setProjects(projectData);
      setSuppliers(supplierData);
      setExpenseItems(categoryData);
      setForm((current) => ({
        ...current,
        project_id: projectData[0]?.id || "",
        supplier_id: supplierData[0]?.id || "",
        category: categoryData[0]?.groupName || current.category,
        category_id: categoryData[0]?.id || current.category_id,
        title: categoryData[0]?.name || current.title,
      }));
      setStatus("connected");
    }).catch(() => setStatus("fallback"));
  }, []);

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
        next.total_cost = String((toNumber(next.quantity) * toNumber(next.unit_cost)).toFixed(2));
      }
      return next;
    });
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    await createExpense({
      ...form,
      expense_type: "project",
      project_id: form.project_id ? Number(form.project_id) : null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      employee_id: null,
      category_id: form.category_id ? Number(form.category_id) : null,
      category: form.category,
      quantity: toNumber(form.quantity),
      unit_cost: toNumber(form.unit_cost),
      total_cost: toNumber(form.total_cost),
      amount: toNumber(form.total_cost),
      is_manual_total: Math.abs(toNumber(form.total_cost) - (toNumber(form.quantity) * toNumber(form.unit_cost))) > 0.001,
    });
    navigate("/expenses");
  };

  const totalCost = toNumber(form.total_cost);

  return <div className="space-y-6">
    <FinanceHeader
      title="Add Project Expense"
      description="Record costs against a specific project for project profit tracking."
      backTo="/expenses"
      backLabel="Back to Expenses"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Category" value={form.category || "Not set"} />
      <FinanceMetric label="Quantity" value={form.quantity || 0} />
      <FinanceMetric label="Total Cost" value={money(totalCost)} />
    </section>
    <FinanceSection title="Expense Form" subtitle="Connect the cost to a project, supplier, category item, and payment method.">
      {status === "fallback" && <FinanceNotice tone="error">Could not load form data. Please login again or check the backend.</FinanceNotice>}
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
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Cashier, admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Quantity"><input name="quantity" type="number" min="0" step="0.01" value={form.quantity} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Unit cost"><input name="unit_cost" type="number" min="0" step="0.01" value={form.unit_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Total cost"><input name="total_cost" type="number" min="0" step="0.01" value={form.total_cost} onChange={updateField} placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/expenses" submitLabel="Save Expense" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
