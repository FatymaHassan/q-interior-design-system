import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit3, Trash2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createPayment, deletePayment, getClients, getPayments, getProjects } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";

const methods = ["cash", "bank transfer", "EVC Plus", "card", "other"];
const paymentTypes = ["Deposit", "Milestone", "Progress Payment", "Final Payment", "Custom Payment"];
const stageOptions = ["", "Inquiry", "Design", "Materials Order", "Installation", "Completed"];

export default function ProjectClientPayments() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ project_id: "", client_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: "", payment_method: "cash", payment_type: "Custom Payment", related_stage: "", reference_number: "", notes: "", receipt: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedProject = useMemo(() => projects.find((project) => String(project.id) === String(form.project_id)), [projects, form.project_id]);

  const load = () => Promise.all([getProjects(), getClients(), getPayments()]).then(([projectRows, clientRows, paymentRows]) => {
    setProjects(projectRows);
    setClients(clientRows);
    setPayments(paymentRows.filter((payment) => payment.isClientPayment));
    setForm((current) => ({ ...current, project_id: current.project_id || projectRows[0]?.id || "", client_id: current.client_id || projectRows[0]?.raw?.client_id || projectRows[0]?.raw?.client?.id || clientRows[0]?.id || "" }));
  });

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!form.project_id) return;
    const project = projects.find((item) => String(item.id) === String(form.project_id));
    if (project) setForm((current) => ({ ...current, client_id: project.raw?.client_id || project.raw?.client?.id || current.client_id }));
  }, [form.project_id, projects]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateFile = (event) => setForm((current) => ({ ...current, receipt: event.target.files?.[0] || null }));
  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payload = new FormData();
    try {
      payload.append("type", "client");
      payload.append("project_id", Number(form.project_id));
      if (form.client_id) payload.append("client_id", Number(form.client_id));
      payload.append("amount", toNumber(form.amount));
      payload.append("payment_date", form.payment_date);
      payload.append("payment_method", form.payment_method);
      payload.append("payment_type", form.payment_type);
      if (form.related_stage) payload.append("related_stage", form.related_stage);
      payload.append("reference_number", form.reference_number);
      payload.append("status", "paid");
      payload.append("notes", form.notes);
      if (form.receipt) payload.append("receipt", form.receipt);
      await createPayment(payload);
      setForm((current) => ({ ...current, amount: "", reference_number: "", notes: "", receipt: null }));
      load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePayment = async (payment) => {
    if (!window.confirm("Delete this client payment?")) return;
    await deletePayment(payment.id);
    load();
  };

  return <div className="space-y-6">
    <div className="flex justify-end">
      <Button form="client-payment-form" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Payment"}</Button>
    </div>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Add Client Payment</h2>
      <form id="client-payment-form" onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} className={fieldInputClass}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
        <FormField label="Amount paid"><input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{methods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Payment type"><select name="payment_type" value={form.payment_type} onChange={updateField} className={fieldInputClass}>{paymentTypes.map((type) => <option key={type}>{type}</option>)}</select></FormField>
        <FormField label="Related stage"><select name="related_stage" value={form.related_stage} onChange={updateField} className={fieldInputClass}>{stageOptions.map((stage) => <option key={stage} value={stage}>{stage || "No stage"}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Receipt"><input type="file" onChange={updateFile} className={fieldInputClass} /></FormField>
        <FormField label="Notes" className="lg:col-span-3"><input name="notes" value={form.notes} onChange={updateField} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button disabled={!selectedProject || !form.amount || isSubmitting}>{isSubmitting ? "Saving..." : "Save Payment"}</Button></div>
      </form>
    </Card>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Recent Client Payments</h2>
      <Table columns={[
        { key: "date", label: "Payment Date" },
        { key: "project", label: "Project" },
        { key: "client", label: "Client" },
        { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
        { key: "paymentType", label: "Type" },
        { key: "relatedStage", label: "Stage" },
        { key: "method", label: "Method" },
        { key: "referenceNumber", label: "Reference" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2">
          <Link to={`/payments/${row.id}/edit`}><Button variant="outline" className="gap-2 px-3 py-2 text-xs"><Edit3 size={14} />Edit</Button></Link>
          <Button type="button" variant="danger" onClick={() => removePayment(row)} className="gap-2 px-3 py-2 text-xs"><Trash2 size={14} />Delete</Button>
        </div> },
      ]} rows={payments} empty="No client payments yet." />
    </Card>
  </div>;
}
