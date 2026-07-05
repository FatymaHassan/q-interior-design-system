import { useEffect, useMemo, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createPayment, getClients, getPayments, getProjectPaymentStages, getProjects } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";

const methods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

export default function ProjectClientPayments() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState({ project_id: "", client_id: "", payment_stage_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: "", payment_method: "cash", reference_number: "", notes: "" });
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
    getProjectPaymentStages(form.project_id).then(setStages).catch(() => setStages([]));
    const project = projects.find((item) => String(item.id) === String(form.project_id));
    if (project) setForm((current) => ({ ...current, client_id: project.raw?.client_id || project.raw?.client?.id || current.client_id, payment_stage_id: "" }));
  }, [form.project_id, projects]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    await createPayment({
      type: "client",
      project_id: Number(form.project_id),
      client_id: form.client_id ? Number(form.client_id) : null,
      payment_stage_id: form.payment_stage_id ? Number(form.payment_stage_id) : null,
      amount: toNumber(form.amount),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number,
      status: "paid",
      notes: form.notes,
    });
    setForm((current) => ({ ...current, amount: "", reference_number: "", notes: "" }));
    load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-bold text-brand-primary">Client Payments</h1>
      <p className="mt-1 text-sm text-brand-muted">Record client money anytime. Every payment is revenue and updates the project/dashboard immediately.</p>
    </div>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Add Client Payment</h2>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} required className={fieldInputClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
        <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} className={fieldInputClass}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
        <FormField label="Linked plan row"><select name="payment_stage_id" value={form.payment_stage_id} onChange={updateField} className={fieldInputClass}><option value="">No linked row</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} - {formatCurrency(stage.balance || stage.amount)}</option>)}</select></FormField>
        <FormField label="Amount paid"><input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={updateField} className={fieldInputClass}>{methods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Notes" className="lg:col-span-2"><input name="notes" value={form.notes} onChange={updateField} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button disabled={!selectedProject || !form.amount}>Save Payment</Button></div>
      </form>
    </Card>
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold">Recent Client Payments</h2>
      <Table columns={[
        { key: "date", label: "Payment Date" },
        { key: "project", label: "Project" },
        { key: "client", label: "Client" },
        { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
        { key: "stage", label: "Plan Row", render: (row) => row.paymentStage || "-" },
        { key: "method", label: "Method" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} rows={payments} empty="No client payments yet." />
    </Card>
  </div>;
}
