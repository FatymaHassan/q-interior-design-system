import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Edit3, Mail, Plus, Trash2 } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import Table from "../../components/ui/Table";
import { createInvoice, deleteInvoice, downloadInvoicePdf, getClients, getInvoices, getProjects, getSuppliers, sendInvoiceReminder, updateInvoice } from "../../services/api";
import { formatCurrency, toNumber } from "../../utils/numberFormat";
import { FinanceActionButton, FinanceMetric, FinanceNotice, FinanceSection } from "./financeUi";

const money = (value) => formatCurrency(value);
const fieldInputClass = "w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";
const emptyItem = { description: "Design fees", quantity: 1, unit: "Unit", unit_price: 0 };

const emptyForm = {
  invoice_type: "client",
  client_id: "",
  supplier_id: "",
  project_id: "",
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  discount: 0,
  tax: 0,
  status: "Unpaid",
  notes: "",
  items: [{ ...emptyItem }],
};

export default function Invoices({ mode = "list" }) {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [status, setStatus] = useState("loading");
  const [filterStatus, setFilterStatus] = useState("");
  const confirm = useConfirmDialog();

  const loadData = () => Promise.all([getInvoices(filterStatus ? { status: filterStatus } : {}), getClients(), getProjects(), getSuppliers()])
    .then(([invoiceData, clientData, projectData, supplierData]) => {
      setInvoices(invoiceData);
      setClients(clientData);
      setProjects(projectData);
      setSuppliers(supplierData);
      setForm((current) => ({ ...current, client_id: current.client_id || clientData[0]?.id || "", supplier_id: current.supplier_id || supplierData[0]?.id || "", project_id: current.project_id || "" }));
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price), 0);
    return {
      subtotal,
      total: Math.max(0, subtotal - toNumber(form.discount) + toNumber(form.tax)),
    };
  }, [form]);

  const submitInvoice = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      client_id: form.invoice_type === "client" ? form.client_id : null,
      supplier_id: form.invoice_type === "supplier" ? form.supplier_id : null,
      discount: toNumber(form.discount),
      tax: toNumber(form.tax),
      project_id: form.project_id || null,
      items: form.items.filter((item) => item.description).map((item) => ({
        description: item.description,
        quantity: toNumber(item.quantity),
        unit: item.unit || "Unit",
        unit_price: toNumber(item.unit_price),
      })),
    };

    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, payload);
    } else {
      await createInvoice(payload);
    }
    resetForm();
    loadData();
  };

  const editInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setForm({
      invoice_type: invoice.type || "client",
      client_id: invoice.clientId || "",
      supplier_id: invoice.supplierId || "",
      project_id: invoice.projectId || "",
      invoice_date: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
      due_date: invoice.dueDate || "",
      discount: invoice.discount,
      tax: invoice.tax,
      status: invoice.status,
      notes: invoice.notes,
      items: invoice.items.length ? invoice.items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
      })) : [{ ...emptyItem }],
    });
  };

  const removeInvoice = async (invoice) => {
    const ok = await confirm({
      title: "Delete invoice?",
      message: `Delete invoice ${invoice.number}? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteInvoice(invoice.id);
    if (editingInvoice?.id === invoice.id) resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditingInvoice(null);
    setForm({ ...emptyForm, client_id: clients[0]?.id || "", supplier_id: suppliers[0]?.id || "" });
  };

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const showForm = mode === "add" || editingInvoice;

  return <div className="space-y-6">
    {mode === "list" && !editingInvoice && <div className="flex justify-end"><Link to="/invoices/add"><Button className="gap-2"><Plus size={16} />Add Invoice</Button></Link></div>}
    {mode === "add" && <div><Link to="/invoices"><Button variant="outline">Back to Invoices</Button></Link></div>}

    {status === "error" && <FinanceNotice tone="error">Invoices could not be loaded.</FinanceNotice>}

    {mode === "list" && !editingInvoice && <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <FinanceMetric label="Invoices" value={invoices.length} />
      <FinanceMetric label="Open Balance" value={money(invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0))} />
      <FinanceMetric label="Paid Total" value={money(invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0))} />
    </section>}

    {showForm && <FinanceSection
      title={editingInvoice ? `Edit ${editingInvoice.number}` : "Create Invoice"}
      subtitle={`Invoice total: ${money(totals.total)}`}
      action={editingInvoice && <Button type="button" variant="outline" onClick={resetForm}>Back to List</Button>}
    >
      <form onSubmit={submitInvoice} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <select value={form.invoice_type} onChange={(event) => setForm((current) => ({ ...current, invoice_type: event.target.value }))} className={fieldInputClass}>
            <option value="client">Client invoice</option>
            <option value="supplier">Supplier invoice</option>
          </select>
          {form.invoice_type === "client" && <select value={form.client_id} onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value }))} className={fieldInputClass} required>
            <option value="">Select client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>}
          {form.invoice_type === "supplier" && <select value={form.supplier_id} onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))} className={fieldInputClass} required>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>}
          <select value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} className={fieldInputClass}>
            <option value="">No project / material order</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <input type="date" value={form.invoice_date} onChange={(event) => setForm((current) => ({ ...current, invoice_date: event.target.value }))} className={fieldInputClass} />
          <input type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} className={fieldInputClass} />
          <input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} placeholder="Discount" className={fieldInputClass} />
          <input type="number" min="0" step="0.01" value={form.tax} onChange={(event) => setForm((current) => ({ ...current, tax: event.target.value }))} placeholder="Tax" className={fieldInputClass} />
          <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={fieldInputClass}>
            <option>Unpaid</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Received</option>
            <option>Partially Paid</option>
            <option>Paid</option>
            <option>Overdue</option>
            <option>Cancelled</option>
          </select>
          <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" className={fieldInputClass} />
        </div>

        <div className="space-y-2">
          {form.items.map((item, index) => <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_120px_160px_44px]">
            <input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Line item description" className={fieldInputClass} />
            <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className={fieldInputClass} />
            <input value={item.unit || "Unit"} onChange={(event) => updateItem(index, "unit", event.target.value)} placeholder="Unit" className={fieldInputClass} />
            <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, "unit_price", event.target.value)} className={fieldInputClass} />
            <button type="button" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="flex h-11 items-center justify-center rounded-xl border border-brand-border text-brand-danger"><Trash2 size={17} /></button>
          </div>)}
          <Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }))} className="gap-2"><Plus size={16} />Add Line</Button>
        </div>

        <Button>{editingInvoice ? "Save Invoice" : "Create Invoice"}</Button>
      </form>
    </FinanceSection>}

    {mode === "list" && !editingInvoice && <FinanceSection
      title="Invoice List"
      subtitle="Manage invoice status, PDF downloads, reminders, and balances."
      action={<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className={`${fieldInputClass} min-w-[220px]`}>
        <option value="">All statuses</option>
        <option>Unpaid</option>
        <option>Partially Paid</option>
        <option>Paid</option>
        <option>Overdue</option>
      </select>}
    >
      <Table
        columns={[
          { key: "number", label: "Invoice", render: (invoice) => <b>{invoice.number}</b> },
          { key: "type", label: "Type", render: (invoice) => <Badge>{invoice.type}</Badge> },
          { key: "party", label: "Client/Supplier", render: (invoice) => invoice.type === "supplier" ? invoice.supplier : invoice.client },
          { key: "project", label: "Project" },
          { key: "dueDate", label: "Due" },
          { key: "total", label: "Total", render: (invoice) => money(invoice.total) },
          { key: "balance", label: "Balance", render: (invoice) => money(invoice.balance) },
          { key: "status", label: "Status", render: (invoice) => <Badge>{invoice.status}</Badge> },
          { key: "actions", label: "Actions", render: (invoice) => <div className="flex flex-wrap gap-2">
            <FinanceActionButton tone="edit" label="Edit invoice" onClick={() => editInvoice(invoice)}><Edit3 /></FinanceActionButton>
            <FinanceActionButton label="Download invoice PDF" onClick={() => downloadInvoicePdf(invoice)}><Download /></FinanceActionButton>
            <FinanceActionButton tone="approve" label="Send invoice reminder" onClick={() => sendInvoiceReminder(invoice.id).then(loadData)}><Mail /></FinanceActionButton>
            <FinanceActionButton tone="delete" label="Delete invoice" onClick={() => removeInvoice(invoice)}><Trash2 /></FinanceActionButton>
          </div> },
        ]}
        rows={invoices}
        empty="No invoices yet."
      />
    </FinanceSection>}
  </div>;
}
