import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getExpenseCategories } from "../../services/api";
import { toNumber } from "../../utils/numberFormat";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";
import { getOverhead, updateOverhead } from "./overheadApi";

const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

const emptyOverhead = {
  title: "",
  category_id: "",
  category: "",
  amount: "",
  paid_by: "",
  overhead_date: "",
  payment_method: "cash",
  notes: "",
};

export default function OverheadEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyOverhead);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getOverhead(id), getExpenseCategories()])
      .then(([overhead, categoryData]) => {
        const raw = overhead.raw || {};
        setCategories(categoryData.filter((category) => category.type === "overhead"));
        setForm({
          title: raw.title || "",
          category_id: raw.category_id || "",
          category: raw.category || "",
          amount: String(raw.amount || ""),
          paid_by: raw.paid_by || "",
          overhead_date: raw.overhead_date || "",
          payment_method: raw.payment_method || "cash",
          notes: raw.notes || "",
        });
        setStatus("connected");
      })
      .catch(() => setStatus("fallback"));
  }, [id]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitOverhead = async (event) => {
    event.preventDefault();
    await updateOverhead(id, {
      ...form,
      category_id: form.category_id ? Number(form.category_id) : null,
      amount: toNumber(form.amount),
    });
    navigate("/overheads");
  };

  const selectedCategory = categories.find((category) => String(category.id) === String(form.category_id));

  return <div className="space-y-6">
    <FinanceHeader
      title="Edit Overhead"
      description="Update office and operating overhead costs."
      backTo="/overheads"
      backLabel="Back to Overheads"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Category" value={selectedCategory?.name || form.category || "Manual"} />
      <FinanceMetric label="Amount" value={money(form.amount)} />
      <FinanceMetric label="Method" value={form.payment_method || "cash"} />
    </section>
    <FinanceSection title="Overhead Form" subtitle="Adjust category, payer, amount, date, payment method, and notes.">
      {status === "fallback" && <FinanceNotice tone="error">Could not load this overhead. Please check the backend and try again.</FinanceNotice>}
      <form onSubmit={submitOverhead} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Overhead title"><input name="title" value={form.title} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Category"><select name="category_id" value={form.category_id} onChange={updateField} className={fieldInputClass}><option value="">Manual category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
        <FormField label="Manual category"><input name="category" value={form.category} onChange={updateField} placeholder="Rent, utilities, transport..." className={fieldInputClass} /></FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Amount"><input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Overhead date"><input name="overhead_date" type="date" value={form.overhead_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/overheads" submitLabel="Update Overhead" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
