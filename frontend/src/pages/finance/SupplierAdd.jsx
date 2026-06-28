import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { createSupplier } from "../../services/api";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";

const emptySupplier = {
  name: "",
  category: "General",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  payment_terms: "",
  opening_balance: 0,
  status: "Active",
  notes: "",
};

export default function SupplierAdd() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySupplier);
  const [error, setError] = useState("");
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveSupplier = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await createSupplier({ ...form, opening_balance: Number(form.opening_balance || 0) });
      navigate("/suppliers");
    } catch {
      setError("Supplier could not be saved. Please check the backend and try again.");
    }
  };

  return <div className="space-y-6">
    <FinanceHeader
      title="Add Supplier"
      description="Create a supplier contact, payment terms, and opening balance."
      backTo="/suppliers"
      backLabel="Back to Suppliers"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Category" value={form.category || "General"} />
      <FinanceMetric label="Opening Balance" value={money(form.opening_balance)} />
      <FinanceMetric label="Status" value={form.status || "Active"} />
    </section>
    <FinanceSection title="Supplier Form" subtitle="Save supplier profile details separately from the supplier list.">
      {error && <FinanceNotice tone="error">{error}</FinanceNotice>}
      <form onSubmit={saveSupplier} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SupplierFields form={form} updateField={updateField} />
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/suppliers" submitLabel="Save Supplier" /></div>
      </form>
    </FinanceSection>
  </div>;
}

function SupplierFields({ form, updateField }) {
  return <>
    <FormField label="Supplier name"><input name="name" value={form.name} onChange={updateField} required className={fieldInputClass} /></FormField>
    <FormField label="Category"><input name="category" value={form.category} onChange={updateField} placeholder="Materials, services..." className={fieldInputClass} /></FormField>
    <FormField label="Contact person"><input name="contact_person" value={form.contact_person || ""} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="Phone"><input name="phone" value={form.phone || ""} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="Email"><input name="email" type="email" value={form.email || ""} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="City"><input name="city" value={form.city || ""} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="Country"><input name="country" value={form.country || ""} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="Opening balance"><input name="opening_balance" type="number" step="0.01" value={form.opening_balance || 0} onChange={updateField} className={fieldInputClass} /></FormField>
    <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option>Active</option><option>Inactive</option><option>Pending Delivery</option><option>Delivered</option><option>Partial</option></select></FormField>
    <FormField label="Payment terms"><input name="payment_terms" value={form.payment_terms || ""} onChange={updateField} placeholder="Net 15, cash, monthly..." className={fieldInputClass} /></FormField>
    <FormField label="Address" className="lg:col-span-2"><textarea name="address" value={form.address || ""} onChange={updateField} rows="2" className={fieldInputClass} /></FormField>
    <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes || ""} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
  </>;
}

export { emptySupplier, SupplierFields };
