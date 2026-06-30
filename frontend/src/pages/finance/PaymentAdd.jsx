import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getClients, getInvoices, getProjectPaymentStages, getProjects, getSuppliers, isClientPayment, isSupplierPayment } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";
import { FinanceFormActions, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";
import { createPayment } from "./paymentApi";

const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

const emptyPayment = {
  type: "client",
  project_id: "",
  client_id: "",
  supplier_id: "",
  payment_stage_id: "",
  invoice_id: "",
  amount: "",
  payment_date: "",
  payment_method: "cash",
  reference_number: "",
  status: "paid",
  notes: "",
};

export default function PaymentAdd() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(emptyPayment);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getProjects(), getClients(), getSuppliers(), getInvoices()]).then(([projectData, clientData, supplierData, invoiceData]) => {
      setProjects(projectData);
      setClients(clientData);
      setSuppliers(supplierData);
      setInvoices(invoiceData);
      setForm((current) => ({ ...current, project_id: projectData[0]?.id || "", client_id: clientData[0]?.id || "", supplier_id: supplierData[0]?.id || "" }));
      setStatus("connected");
    }).catch(() => setStatus("fallback"));
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateProject = async (event) => {
    const projectId = event.target.value;
    setForm((current) => ({ ...current, project_id: projectId, payment_stage_id: "" }));
    setStages(projectId ? await getProjectPaymentStages(projectId).catch(() => []) : []);
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    await createPayment({
      ...form,
      project_id: form.project_id ? Number(form.project_id) : null,
      client_id: isClientPayment(form.type) && form.client_id ? Number(form.client_id) : null,
      supplier_id: isSupplierPayment(form.type) && form.supplier_id ? Number(form.supplier_id) : null,
      payment_stage_id: form.payment_stage_id ? Number(form.payment_stage_id) : null,
      invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
      amount: toNumber(form.amount),
    });
    navigate("/payments");
  };

  const previewAmount = toNumber(form.amount);

  return <div className="space-y-6">
    <FinanceHeader
      title="Add Payment"
      description="Record client receipts or supplier payouts against projects, stages, and invoices."
      backTo="/payments"
      backLabel="Back to Payments"
    />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <FinanceMetric label="Payment Type" value={isSupplierPayment(form.type) ? "Supplier" : "Client"} />
      <FinanceMetric label="Amount" value={money(previewAmount)} />
      <FinanceMetric label="Status" value={form.status || "paid"} />
    </section>
    <FinanceSection title="Payment Form" subtitle="Choose the related party first, then attach project, invoice, and reference details.">
      {status === "fallback" && <FinanceNotice tone="error">Backend is not reachable.</FinanceNotice>}
      <form onSubmit={submitPayment} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Payment type"><select name="type" value={form.type} onChange={updateField} className={fieldInputClass}><option value="client">Client payment</option><option value="supplier">Supplier payment</option></select></FormField>
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateProject} className={fieldInputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        {isClientPayment(form.type) && <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} className={fieldInputClass}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>}
        {isSupplierPayment(form.type) && <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>}
        {isClientPayment(form.type) && <FormField label="Payment stage"><select name="payment_stage_id" value={form.payment_stage_id} onChange={updateField} className={fieldInputClass}><option value="">No stage</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} - {formatCurrency(stage.balance || stage.amount)}</option>)}</select></FormField>}
        <FormField label="Invoice"><select name="invoice_id" value={form.invoice_id} onChange={updateField} className={fieldInputClass}><option value="">No invoice</option>{invoices.filter((invoice) => isSupplierPayment(form.type) ? invoice.type === "supplier" : invoice.type === "client").map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} - {invoice.type === "supplier" ? invoice.supplier : invoice.client}</option>)}</select></FormField>
        <FormField label="Amount"><input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={updateField} required placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={updateField} placeholder="Receipt, transfer, or invoice reference" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FinanceFormActions cancelTo="/payments" submitLabel="Save Payment" disabled={status !== "connected"} /></div>
      </form>
    </FinanceSection>
  </div>;
}
