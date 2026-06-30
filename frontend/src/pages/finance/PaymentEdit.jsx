import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getClients, getProjects, getSuppliers, isClientPayment, isSupplierPayment } from "../../services/api";
import { toNumber } from "../../utils/numberFormat";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";
import { getPayment, updatePayment } from "./paymentApi";

const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

const emptyPayment = {
  type: "client",
  project_id: "",
  client_id: "",
  supplier_id: "",
  amount: "",
  payment_date: "",
  payment_method: "cash",
  reference_number: "",
  status: "paid",
  notes: "",
};

export default function PaymentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyPayment);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getPayment(id), getProjects(), getClients(), getSuppliers()])
      .then(([payment, projectData, clientData, supplierData]) => {
        const raw = payment.raw || {};
        setProjects(projectData);
        setClients(clientData);
        setSuppliers(supplierData);
        setForm({
          type: raw.type || "client",
          project_id: raw.project_id || "",
          client_id: raw.client_id || "",
          supplier_id: raw.supplier_id || "",
          amount: String(raw.amount || ""),
          payment_date: raw.payment_date || "",
          payment_method: raw.payment_method || raw.method || "cash",
          reference_number: raw.reference_number || "",
          status: raw.status || "paid",
          notes: raw.notes || "",
        });
        setStatus("connected");
      })
      .catch(() => setStatus("fallback"));
  }, [id]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitPayment = async (event) => {
    event.preventDefault();
    await updatePayment(id, {
      ...form,
      project_id: form.project_id ? Number(form.project_id) : null,
      client_id: isClientPayment(form.type) && form.client_id ? Number(form.client_id) : null,
      supplier_id: isSupplierPayment(form.type) && form.supplier_id ? Number(form.supplier_id) : null,
      amount: toNumber(form.amount),
    });
    navigate("/payments");
  };

  const previewAmount = toNumber(form.amount);

  return <div className="space-y-6">
    <FinanceHeader
      title="Edit Payment"
      description="Update client receipts and supplier payment records without changing the current finance workflow."
      backTo="/payments"
      backLabel="Back to Payments"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Payment Type" value={isSupplierPayment(form.type) ? "Supplier" : "Client"} />
      <FinanceMetric label="Amount" value={money(previewAmount)} />
      <FinanceMetric label="Status" value={form.status || "paid"} />
    </section>
    <FinanceSection title="Payment Form" subtitle="Adjust the party, project, amount, date, and payment reference.">
      {status === "fallback" && <FinanceNotice tone="error">Could not load this payment. Please check the backend and try again.</FinanceNotice>}
      <form onSubmit={submitPayment} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Payment type"><select name="type" value={form.type} onChange={updateField} className={fieldInputClass}><option value="client">Client payment</option><option value="supplier">Supplier payment</option></select></FormField>
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} className={fieldInputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        {isClientPayment(form.type) && <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} className={fieldInputClass}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>}
        {isSupplierPayment(form.type) && <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>}
        <FormField label="Amount"><input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={updateField} placeholder="Receipt, transfer, or invoice reference" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/payments" submitLabel="Update Payment" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
