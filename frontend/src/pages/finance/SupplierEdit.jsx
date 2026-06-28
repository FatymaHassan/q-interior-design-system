import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSuppliers, updateSupplier } from "../../services/api";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";
import { emptySupplier, SupplierFields } from "./SupplierAdd";

export default function SupplierEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySupplier);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    getSuppliers()
      .then((suppliers) => {
        const supplier = suppliers.find((item) => String(item.id) === String(id));
        if (!supplier) {
          setStatus("missing");
          return;
        }
        setForm({
          ...emptySupplier,
          ...supplier.raw,
          opening_balance: supplier.raw?.opening_balance || 0,
        });
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveSupplier = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await updateSupplier(id, { ...form, opening_balance: Number(form.opening_balance || 0) });
      navigate("/suppliers");
    } catch {
      setError("Supplier could not be updated. Please check the backend and try again.");
    }
  };

  return <div className="space-y-6">
    <FinanceHeader
      title="Edit Supplier"
      description="Update supplier contact, payment terms, and opening balance."
      backTo="/suppliers"
      backLabel="Back to Suppliers"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Category" value={form.category || "General"} />
      <FinanceMetric label="Opening Balance" value={money(form.opening_balance)} />
      <FinanceMetric label="Status" value={form.status || "Active"} />
    </section>
    <FinanceSection title="Supplier Form" subtitle="Edit supplier profile details separately from the supplier list.">
      {status === "error" && <FinanceNotice tone="error">Could not load suppliers. Please check the backend and try again.</FinanceNotice>}
      {status === "missing" && <FinanceNotice tone="error">Supplier was not found.</FinanceNotice>}
      {error && <FinanceNotice tone="error">{error}</FinanceNotice>}
      <form onSubmit={saveSupplier} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SupplierFields form={form} updateField={updateField} />
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/suppliers" submitLabel="Update Supplier" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
