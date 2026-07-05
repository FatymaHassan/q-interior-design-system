import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createExpense, getExpenses, getProjects, getSuppliers } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";

const categories = ["Materials", "Labour", "Design", "Site expenses", "Transport", "Fuel", "Equipment rental", "Supplier payment", "Food for workers", "Other"];
const methods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

export default function ProjectExpensesWorkspace() {
  const [projects, setProjects] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ project_id: "", expense_date: new Date().toISOString().slice(0, 10), category: "Materials", amount: "", paid_to: "", supplier_id: "", payment_method: "cash", notes: "" });

  const load = () => Promise.all([getProjects(), getSuppliers(), getExpenses({ expense_type: "project" })]).then(([projectRows, supplierRows, expenseRows]) => {
    setProjects(projectRows);
    setSuppliers(supplierRows);
    setExpenses(expenseRows);
    setForm((current) => ({ ...current, project_id: current.project_id || projectRows[0]?.id || "" }));
  });

  useEffect(() => { load(); }, []);
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    await createExpense({
      expense_type: "project",
      project_id: Number(form.project_id),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      category: form.category,
      title: form.category,
      paid_by: form.paid_to,
      quantity: 1,
      unit_cost: toNumber(form.amount),
      total_cost: toNumber(form.amount),
      amount: toNumber(form.amount),
      expense_date: form.expense_date,
      payment_method: form.payment_method,
      notes: form.notes,
      is_manual_total: true,
    });
    setForm((current) => ({ ...current, amount: "", paid_to: "", notes: "" }));
    load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-bold text-brand-primary">Project Expenses</h1>
      <p className="mt-1 text-sm text-brand-muted">Record direct project costs separately from client payments.</p>
    </div>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Add Project Expense</h2>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Category"><select name="category" value={form.category} onChange={updateField} className={fieldInputClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select></FormField>
        <FormField label="Amount"><input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Paid to"><input name="paid_to" value={form.paid_to} onChange={updateField} placeholder="Supplier, employee, or worker" className={fieldInputClass} /></FormField>
        <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{methods.map((method) => <option key={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><input name="notes" value={form.notes} onChange={updateField} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button disabled={!form.project_id || !form.amount}>Save Expense</Button></div>
      </form>
    </Card>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Recent Project Expenses</h2>
      <Table columns={[
        { key: "date", label: "Expense Date" },
        { key: "project", label: "Project" },
        { key: "category", label: "Category" },
        { key: "paidBy", label: "Paid To" },
        { key: "method", label: "Method" },
        { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amountValue ?? row.amount) },
      ]} rows={expenses} empty="No project expenses yet." />
    </Card>
  </div>;
}
