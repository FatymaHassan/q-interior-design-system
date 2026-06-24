import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getClients, getProjects, getSuppliers, isClientPayment, isSupplierPayment } from "../../services/api";
import { createPayment } from "./paymentApi";

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

export default function PaymentAdd() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyPayment);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    Promise.all([getProjects(), getClients(), getSuppliers()]).then(([projectData, clientData, supplierData]) => {
      setProjects(projectData);
      setClients(clientData);
      setSuppliers(supplierData);
      setForm((current) => ({ ...current, project_id: projectData[0]?.id || "", client_id: clientData[0]?.id || "", supplier_id: supplierData[0]?.id || "" }));
      setStatus("connected");
    }).catch(() => setStatus("fallback"));
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitPayment = async (event) => {
    event.preventDefault();
    await createPayment({
      ...form,
      project_id: form.project_id ? Number(form.project_id) : null,
      client_id: isClientPayment(form.type) && form.client_id ? Number(form.client_id) : null,
      supplier_id: isSupplierPayment(form.type) && form.supplier_id ? Number(form.supplier_id) : null,
      amount: Number(form.amount || 0),
    });
    navigate("/payments");
  };

  return <div className="space-y-6">
    <div><Link to="/payments"><Button variant="outline">Back to Payments</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Add Payment</h2>
      <p className="text-sm text-brand-muted">Record client receipts or supplier payouts against projects.</p>
      {status === "fallback" && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">Backend is not reachable.</p>}
      <form onSubmit={submitPayment} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Payment type"><select name="type" value={form.type} onChange={updateField} className={fieldInputClass}><option value="client">Client payment</option><option value="supplier">Supplier payment</option></select></FormField>
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} className={fieldInputClass}><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        {isClientPayment(form.type) && <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} className={fieldInputClass}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>}
        {isSupplierPayment(form.type) && <FormField label="Supplier"><select name="supplier_id" value={form.supplier_id} onChange={updateField} className={fieldInputClass}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>}
        <FormField label="Amount"><input name="amount" type="number" min="0" value={form.amount} onChange={updateField} required placeholder="0" className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={updateField} placeholder="Receipt, transfer, or invoice reference" className={fieldInputClass} /></FormField>
        <FormField label="Status"><select name="status" value={form.status} onChange={updateField} className={fieldInputClass}><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></FormField>
        <FormField label="Notes" className="lg:col-span-2"><textarea name="notes" value={form.notes} onChange={updateField} rows="3" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><Button disabled={status !== "connected"}>Save Payment</Button></div>
      </form>
    </Card>
  </div>;
}
