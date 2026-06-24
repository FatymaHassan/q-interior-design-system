import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getExpenseCategories } from "../../services/api";
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
      amount: Number(form.amount || 0),
    });
    navigate("/overheads");
  };

  return <div className="space-y-6">
    <div><Link to="/overheads"><Button variant="outline">Back to Overheads</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Edit Overhead</h2>
      <p className="text-sm text-brand-muted">Update office and operating overhead costs.</p>
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">Could not load this overhead. Please check the backend and try again.</p>}
      <form onSubmit={submitOverhead} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Overhead title"><input name="title" value={form.title} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Category"><select name="category_id" value={form.category_id} onChange={updateField} className={fieldInputClass}><option value="">Manual category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></FormField>
        <FormField label="Manual category"><input name="category" value={form.category} onChange={updateField} placeholder="Rent, utilities, transport..." className={fieldInputClass} /></FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={updateField} placeholder="Admin, manager..." className={fieldInputClass} /></FormField>
        <FormField label="Amount"><input name="amount" type="number" min="0" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Overhead date"><input name="overhead_date" type="date" value={form.overhead_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><Button disabled={status !== "connected"}>Update Overhead</Button></div>
      </form>
    </Card>
  </div>;
}
