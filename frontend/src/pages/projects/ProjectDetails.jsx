import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import ProgressBar from "../../components/ui/ProgressBar";
import Table from "../../components/ui/Table";
import { addProjectMember, createDocument, createExpense, createPayment, deleteDocument, downloadDocumentFile, getEmployees, getExpenseCategories, getMaterials, getProjectFinanceSummary, getProjectMaterialsUsed, getProjectMembers, getProjectTimeline, getSuppliers, removeProjectMember, stockOutMaterial, updateDocument } from "../../services/api";
import { formatCurrency, formatPercentage, toNumber } from "../../utils/numberFormat";
import { getProject } from "./projectApi";

const tabs = ["Overview", "Payment Plan", "Client Payments / Revenue", "Expenses", "Financial Summary", "Documents", "Tasks", "Timeline", "Team", "Materials Used", "Client Messages", "Approvals"];
const paymentMethods = ["cash", "bank transfer", "EVC Plus", "card", "other"];

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [materialsUsed, setMaterialsUsed] = useState([]);
  const [finance, setFinance] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [memberForm, setMemberForm] = useState({ employee_id: "", role_on_project: "Member", assigned_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [docForm, setDocForm] = useState({ title: "", document_category: "Photo", visibility: "internal", file: null });
  const [editingDocument, setEditingDocument] = useState(null);
  const [materialForm, setMaterialForm] = useState({ material_id: "", quantity: 1, unit_cost: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ payment_stage_id: "", amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "cash", reference_number: "", notes: "" });
  const [expenseForm, setExpenseForm] = useState({ supplier_id: "", category_id: "", category: "", title: "", paid_by: "", quantity: "1", unit_cost: "", total_cost: "", expense_date: new Date().toISOString().slice(0, 10), payment_method: "cash", notes: "" });
  const [status, setStatus] = useState("loading");

  const loadProject = () => Promise.all([getProject(id), getEmployees({ status: "Active" }), getProjectMembers(id), getProjectTimeline(id), getMaterials(), getProjectMaterialsUsed(id), getProjectFinanceSummary(id), getSuppliers(), getExpenseCategories({ expense_type: "project", status: "Active" })])
    .then(([data, employeeData, projectMemberData, timelineData, materialData, materialsUsedData, financeData, supplierData, categoryData]) => {
      setProject(data);
      setEmployees(employeeData);
      setProjectMembers(projectMemberData);
      setTimeline(timelineData.items || []);
      setMaterials(materialData);
      setMaterialsUsed(materialsUsedData.movements || []);
      setFinance(financeData);
      setSuppliers(supplierData);
      setExpenseItems(categoryData);
      setMemberForm((current) => ({ ...current, employee_id: current.employee_id || employeeData[0]?.id || "" }));
      setMaterialForm((current) => ({
        ...current,
        material_id: current.material_id || materialData[0]?.id || "",
        unit_cost: current.unit_cost || materialData[0]?.purchasePrice || "",
      }));
      setExpenseForm((current) => ({
        ...current,
        supplier_id: current.supplier_id || supplierData[0]?.id || "",
        category_id: current.category_id || categoryData[0]?.id || "",
        category: current.category || categoryData[0]?.groupName || "",
        title: current.title || categoryData[0]?.name || "",
      }));
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => {
    loadProject();
  }, [id]);

  const raw = project?.raw || {};
  const members = useMemo(() => projectMembers.length ? projectMembers : raw.members || [], [projectMembers, raw.members]);
  const documents = useMemo(() => raw.documents || [], [raw.documents]);
  const tasks = useMemo(() => raw.tasks || [], [raw.tasks]);
  const messages = useMemo(() => raw.client_messages || [], [raw.client_messages]);
  const approvals = useMemo(() => raw.approvals || [], [raw.approvals]);

  const addMember = async (event) => {
    event.preventDefault();
    await addProjectMember(id, {
      employee_id: Number(memberForm.employee_id),
      role_on_project: memberForm.role_on_project,
      assigned_date: memberForm.assigned_date,
      notes: memberForm.notes,
    });
    loadProject();
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.employee?.name || member.user?.name || "this member"} from the project?`)) return;
    await removeProjectMember(id, member.id);
    loadProject();
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!docForm.title || (!editingDocument && !docForm.file)) return;
    const form = new FormData();
    form.append("project_id", id);
    form.append("title", docForm.title);
    form.append("document_category", docForm.document_category);
    form.append("visibility", docForm.visibility);
    if (docForm.file) form.append("file", docForm.file);
    if (editingDocument) {
      await updateDocument(editingDocument.id, form);
    } else {
      await createDocument(form);
    }
    setEditingDocument(null);
    setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
    event.target.reset();
    loadProject();
  };

  const editDocument = (document) => {
    setEditingDocument(document);
    setDocForm({
      title: document.title,
      document_category: document.document_category || "Other",
      visibility: document.visibility || "internal",
      file: null,
    });
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Delete "${document.title}"?`)) return;
    await deleteDocument(document.id);
    if (editingDocument?.id === document.id) {
      setEditingDocument(null);
      setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
    }
    loadProject();
  };

  const addProjectMaterial = async (event) => {
    event.preventDefault();
    if (!materialForm.material_id) return;
    const selected = materials.find((material) => Number(material.id) === Number(materialForm.material_id));
    await stockOutMaterial(materialForm.material_id, {
      project_id: Number(id),
      quantity: toNumber(materialForm.quantity),
      unit_cost: toNumber(materialForm.unit_cost || selected?.purchasePrice),
      notes: materialForm.notes,
    });
    setMaterialForm((current) => ({ ...current, quantity: 1, notes: "" }));
    loadProject();
  };

  const updatePaymentForm = (event) => setPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const addClientPayment = async (event) => {
    event.preventDefault();
    await createPayment({
      type: "client",
      project_id: Number(id),
      client_id: raw.client_id || raw.client?.id || null,
      payment_stage_id: paymentForm.payment_stage_id ? Number(paymentForm.payment_stage_id) : null,
      amount: toNumber(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      reference_number: paymentForm.reference_number,
      status: "paid",
      notes: paymentForm.notes,
    });
    setPaymentForm({ payment_stage_id: "", amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "cash", reference_number: "", notes: "" });
    loadProject();
  };

  const updateExpenseForm = (event) => {
    const { name, value } = event.target;
    setExpenseForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "category_id") {
        const selected = expenseItems.find((item) => String(item.id) === String(value));
        next.category = selected?.groupName || "";
        next.title = selected?.name || "";
      }
      if (name === "quantity" || name === "unit_cost") {
        next.total_cost = String((toNumber(next.quantity) * toNumber(next.unit_cost)).toFixed(2));
      }
      return next;
    });
  };
  const addProjectExpense = async (event) => {
    event.preventDefault();
    await createExpense({
      expense_type: "project",
      project_id: Number(id),
      supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
      category_id: expenseForm.category_id ? Number(expenseForm.category_id) : null,
      category: expenseForm.category,
      title: expenseForm.title || "Project expense",
      paid_by: expenseForm.paid_by,
      quantity: toNumber(expenseForm.quantity),
      unit_cost: toNumber(expenseForm.unit_cost),
      total_cost: toNumber(expenseForm.total_cost),
      amount: toNumber(expenseForm.total_cost),
      expense_date: expenseForm.expense_date,
      payment_method: expenseForm.payment_method,
      notes: expenseForm.notes,
      is_manual_total: Math.abs(toNumber(expenseForm.total_cost) - (toNumber(expenseForm.quantity) * toNumber(expenseForm.unit_cost))) > 0.001,
    });
    setExpenseForm((current) => ({ ...current, paid_by: "", quantity: "1", unit_cost: "", total_cost: "", notes: "" }));
    loadProject();
  };

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading project...</Card>;
  if (status === "error" || !project) return <Card className="p-5 text-sm text-brand-danger">Project could not be loaded.</Card>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/projects"><Button variant="outline">Back to Projects</Button></Link>
      <Link to={`/projects/${project.id}/edit`}><Button>Edit Project</Button></Link>
    </div>

    <Card className="p-5 md:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">Project Details</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-brand-primary">{project.name}</h2>
          <p className="mt-2 text-sm text-brand-muted">{raw.description || raw.notes || "No notes added yet."}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Badge>{project.stage}</Badge><Badge>{project.status}</Badge></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Client" value={project.client} />
          <Metric label="Location" value={project.location} />
          <Metric label="Start Date" value={raw.start_date || "-"} />
          <Metric label="Deadline" value={project.deadline} />
          <Metric label="Budget" value={formatCurrency(project.budget)} />
          <Metric label="Budget Used" value={formatCurrency(raw.actual_cost)} />
        </div>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm"><span>Progress</span><b>{project.progress}%</b></div>
        <ProgressBar value={project.progress} />
      </div>
    </Card>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => <Button key={tab} variant={activeTab === tab ? "primary" : "outline"} className="whitespace-nowrap px-4 py-2" onClick={() => setActiveTab(tab)}>{tab}</Button>)}
    </div>

    {activeTab === "Overview" && <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5"><h3 className="mb-4 font-bold">Client Information</h3><InfoRows rows={[["Name", raw.client?.name], ["Phone", raw.client?.phone], ["Email", raw.client?.email], ["Address", raw.client?.address || raw.client?.location]]} /></Card>
      <Card className="p-5"><h3 className="mb-4 font-bold">Notes</h3><p className="text-sm text-brand-muted">{raw.notes || raw.description || "No notes added."}</p></Card>
    </section>}

    {activeTab === "Payment Plan" && <PaymentPlanTab finance={finance} />}

    {activeTab === "Client Payments / Revenue" && <ClientPaymentsTab
      finance={finance}
      form={paymentForm}
      onChange={updatePaymentForm}
      onSubmit={addClientPayment}
    />}

    {activeTab === "Expenses" && <ProjectExpensesTab
      finance={finance}
      form={expenseForm}
      suppliers={suppliers}
      expenseItems={expenseItems}
      onChange={updateExpenseForm}
      onSubmit={addProjectExpense}
    />}

    {activeTab === "Financial Summary" && <ProjectFinancePanel finance={finance} />}

    {activeTab === "Tasks" && <Card className="p-5">
      <Table columns={[
        { key: "title", label: "Task", render: (task) => <Link to={`/tasks/${task.id}`} className="font-bold text-brand-primary hover:underline">{task.title}</Link> },
        { key: "assignee", label: "Assigned", render: (task) => (task.assignee_employee || task.assigneeEmployee)?.name || task.assignee?.name || "-" },
        { key: "priority", label: "Priority", render: (task) => <Badge>{task.priority}</Badge> },
        { key: "status", label: "Status", render: (task) => <Badge>{task.status}</Badge> },
        { key: "deadline", label: "Deadline" },
      ]} rows={tasks} empty="No daily tasks for this project yet." />
    </Card>}

    {activeTab === "Documents" && <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-bold">{editingDocument ? "Edit Project Document" : "Upload Project Document"}</h3>
        {editingDocument && <Button type="button" variant="outline" onClick={() => {
          setEditingDocument(null);
          setDocForm({ title: "", document_category: "Photo", visibility: "internal", file: null });
        }}>Cancel Edit</Button>}
      </div>
      <form onSubmit={uploadDocument} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_160px_1fr_auto]">
        <input value={docForm.title} onChange={(event) => setDocForm((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" className={fieldInputClass} />
        <select value={docForm.document_category} onChange={(event) => setDocForm((current) => ({ ...current, document_category: event.target.value }))} className={fieldInputClass}><option>Photo</option><option>Design File</option><option>Contract</option><option>Receipt</option><option>Invoice</option><option>Other</option></select>
        <select value={docForm.visibility} onChange={(event) => setDocForm((current) => ({ ...current, visibility: event.target.value }))} className={fieldInputClass}><option value="internal">Internal</option><option value="client">Client</option></select>
        <input type="file" onChange={(event) => setDocForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} className={fieldInputClass} />
        <Button disabled={!docForm.title || (!editingDocument && !docForm.file)}>{editingDocument ? "Save" : "Upload"}</Button>
      </form>
      <Table columns={[
        { key: "title", label: "Title", render: (document) => <b>{document.title}</b> },
        { key: "document_category", label: "Category" },
        { key: "visibility", label: "Visibility", render: (document) => <Badge>{document.visibility}</Badge> },
        { key: "file_path", label: "File", render: (document) => document.file_path ? <button type="button" onClick={() => downloadDocumentFile(document)} className="font-semibold text-brand-primary underline">Download</button> : "-" },
        { key: "actions", label: "Actions", render: (document) => <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => editDocument(document)} className="font-semibold text-brand-primary underline">Edit</button>
          <button type="button" onClick={() => removeDocument(document)} className="font-semibold text-brand-danger underline">Delete</button>
        </div> },
      ]} rows={documents} empty="No documents uploaded for this project yet." />
    </Card>}

    {activeTab === "Timeline" && <Card className="p-5">
      <h3 className="mb-4 font-bold">Project Timeline</h3>
      <div className="space-y-3">
        {timeline.map((item, index) => <div key={`${item.type}-${index}`} className="flex gap-3 rounded-2xl border border-brand-border p-4">
          <div className="mt-1 h-3 w-3 rounded-full bg-brand-gold" />
          <div><b>{item.title}</b><p className="text-sm text-brand-muted">{item.type} - {item.status} - {item.date ? new Date(item.date).toLocaleString() : "-"}</p></div>
        </div>)}
        {timeline.length === 0 && <p className="text-sm text-brand-muted">No timeline events yet.</p>}
      </div>
    </Card>}

    {activeTab === "Team" && <Card className="p-5">
      <form onSubmit={addMember} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <FormField label="Employee"><select value={memberForm.employee_id} onChange={(event) => setMemberForm((current) => ({ ...current, employee_id: event.target.value }))} className={fieldInputClass}>{employees.map((member) => <option key={member.id} value={member.id}>{member.name} - {member.position}</option>)}</select><Link to="/hr/employees/add" className="mt-2 block text-sm font-bold text-brand-primary">+ Add Employee in Directory</Link></FormField>
        <FormField label="Role on project"><input value={memberForm.role_on_project} onChange={(event) => setMemberForm((current) => ({ ...current, role_on_project: event.target.value }))} className={fieldInputClass} /></FormField>
        <div className="flex items-end"><Button disabled={!memberForm.employee_id}>Add</Button></div>
      </form>
      <Table columns={[
        { key: "member", label: "Member", render: (member) => <b>{member.employee?.name || member.user?.name || "-"}</b> },
        { key: "position", label: "Position", render: (member) => member.employee?.position || "-" },
        { key: "role", label: "Project Role", render: (member) => member.role_on_project || member.role || "-" },
        { key: "phone", label: "Phone", render: (member) => member.employee?.phone || "-" },
        { key: "assigned", label: "Assigned", render: (member) => member.assigned_date || member.assigned_at || "-" },
        { key: "status", label: "Status", render: (member) => <Badge>{member.employee?.status || "Active"}</Badge> },
        { key: "actions", label: "Actions", render: (member) => <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeMember(member)}>Remove</Button> },
      ]} rows={members} empty="No employees assigned yet." />
    </Card>}

    {activeTab === "Materials Used" && <Card className="p-5">
      <h3 className="mb-4 font-bold">Project Materials Used</h3>
      <form onSubmit={addProjectMaterial} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_140px_140px_1fr_auto]">
        <select value={materialForm.material_id} onChange={(event) => {
          const selected = materials.find((material) => Number(material.id) === Number(event.target.value));
          setMaterialForm((current) => ({ ...current, material_id: event.target.value, unit_cost: selected?.purchasePrice || current.unit_cost }));
        }} className={fieldInputClass}>
          {materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.currentStock} {material.unit})</option>)}
        </select>
        <input type="number" min="0.01" step="0.01" value={materialForm.quantity} onChange={(event) => setMaterialForm((current) => ({ ...current, quantity: event.target.value }))} className={fieldInputClass} />
        <input type="number" min="0" step="0.01" value={materialForm.unit_cost} onChange={(event) => setMaterialForm((current) => ({ ...current, unit_cost: event.target.value }))} className={fieldInputClass} />
        <input placeholder="Notes" value={materialForm.notes} onChange={(event) => setMaterialForm((current) => ({ ...current, notes: event.target.value }))} className={fieldInputClass} />
        <Button disabled={!materialForm.material_id}>Add Usage</Button>
      </form>
      <Table columns={[
        { key: "material", label: "Material", render: (movement) => <b>{movement.material?.name || "-"}</b> },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit", render: (movement) => movement.material?.unit || "-" },
        { key: "unit_cost", label: "Unit Cost", render: (movement) => formatCurrency(movement.unit_cost) },
        { key: "total_cost", label: "Total", render: (movement) => formatCurrency(movement.total_cost) },
        { key: "movement_date", label: "Date" },
        { key: "created_by", label: "Created By", render: (movement) => movement.creator?.name || "-" },
        { key: "notes", label: "Notes" },
      ]} rows={materialsUsed} empty="No materials recorded for this project yet." />
    </Card>}

    {activeTab === "Client Messages" && <Card className="p-5">
      <div className="space-y-3">
        {messages.map((message) => <div key={message.id} className="rounded-2xl border border-brand-border p-4 text-sm"><b>{message.sender_type === "client" ? raw.client?.name : message.user?.name || "Staff"}</b><p className="mt-1 text-brand-muted">{message.message}</p></div>)}
        {messages.length === 0 && <p className="text-sm text-brand-muted">No client messages yet.</p>}
      </div>
    </Card>}

    {activeTab === "Approvals" && <Card className="p-5">
      <div className="space-y-3">
        {approvals.map((approval) => <div key={approval.id} className="rounded-2xl bg-brand-soft p-4 text-sm"><div className="flex justify-between gap-3"><b>{approval.title}</b><Badge>{approval.status}</Badge></div><p className="mt-1 text-brand-muted">{approval.description}</p></div>)}
        {approvals.length === 0 && <p className="text-sm text-brand-muted">No client approvals yet.</p>}
      </div>
    </Card>}
    
  </div>;
}

function Metric({ label, value }) {
  return <div className="rounded-2xl bg-brand-soft p-4"><span className="text-brand-muted">{label}</span><b className="mt-1 block">{value || "-"}</b></div>;
}

function InfoRows({ rows }) {
  return <div className="space-y-3 text-sm">{rows.map(([label, value]) => <div key={label} className="flex justify-between rounded-xl bg-brand-soft p-3"><span>{label}</span><b>{value || "-"}</b></div>)}</div>;
}

function PaymentPlanTab({ finance }) {
  const money = (value) => formatCurrency(value);
  return <Card className="p-5">
    <h3 className="mb-4 font-bold">Payment Plan</h3>
    <Table columns={[
      { key: "name", label: "Payment Title", render: (stage) => <b>{stage.name}</b> },
      { key: "percentage", label: "Percentage", render: (stage) => formatPercentage(stage.percentage) },
      { key: "amount", label: "Expected Amount", render: (stage) => money(stage.amount) },
      { key: "paid_amount", label: "Paid Amount", render: (stage) => money(stage.paid_amount) },
      { key: "balance", label: "Remaining", render: (stage) => money(stage.balance) },
      { key: "due", label: "Due Date/Stage", render: (stage) => stage.due_date || stage.due_condition || "-" },
      { key: "status", label: "Status", render: (stage) => <Badge>{stage.status}</Badge> },
      { key: "action", label: "Action", render: () => <span className="text-sm font-semibold text-brand-muted">Link payment when recording revenue</span> },
    ]} rows={finance?.payment_stages || []} empty="No payment plan rows yet." />
  </Card>;
}

function ClientPaymentsTab({ finance, form, onChange, onSubmit }) {
  const money = (value) => formatCurrency(value);
  return <div className="space-y-5">
    <Card className="p-5">
      <h3 className="font-bold">Add Client Payment</h3>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FormField label="Related installment"><select name="payment_stage_id" value={form.payment_stage_id} onChange={onChange} className={fieldInputClass}><option value="">No installment</option>{(finance?.payment_stages || []).map((stage) => <option key={stage.id} value={stage.id}>{stage.name} - {money(stage.balance || stage.amount)}</option>)}</select></FormField>
        <FormField label="Amount paid"><input name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Payment date"><input name="payment_date" type="date" value={form.payment_date} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={onChange} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Reference number"><input name="reference_number" value={form.reference_number} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Notes"><input name="notes" value={form.notes} onChange={onChange} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button disabled={!form.amount}>Add Payment</Button></div>
      </form>
    </Card>
    <FinanceTable title="Recent Client Payments" rows={finance?.client_payments || []} columns={[
      { key: "payment_date", label: "Date" },
      { key: "amount", label: "Amount", render: (row) => money(row.amount) },
      { key: "payment_stage", label: "Installment", render: (row) => row.payment_stage?.name || "-" },
      { key: "payment_method", label: "Method" },
      { key: "reference_number", label: "Reference" },
      { key: "notes", label: "Notes" },
    ]} />
  </div>;
}

function ProjectExpensesTab({ finance, form, suppliers, expenseItems, onChange, onSubmit }) {
  const money = (value) => formatCurrency(value);
  return <div className="space-y-5">
    <Card className="p-5">
      <h3 className="font-bold">Add Project Expense</h3>
      <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FormField label="Category"><select name="category_id" value={form.category_id} onChange={onChange} className={fieldInputClass}><option value="">Select category</option>{expenseItems.map((item) => <option key={item.id} value={item.id}>{item.groupName ? `${item.groupName} - ` : ""}{item.name}</option>)}</select></FormField>
        <FormField label="Supplier / paid to"><select name="supplier_id" value={form.supplier_id} onChange={onChange} className={fieldInputClass}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></FormField>
        <FormField label="Paid by"><input name="paid_by" value={form.paid_by} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Quantity"><input name="quantity" type="number" min="0" step="0.01" value={form.quantity} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Unit cost"><input name="unit_cost" type="number" min="0" step="0.01" value={form.unit_cost} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Amount"><input name="total_cost" type="number" min="0" step="0.01" required value={form.total_cost} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Expense date"><input name="expense_date" type="date" value={form.expense_date} onChange={onChange} className={fieldInputClass} /></FormField>
        <FormField label="Payment method"><select name="payment_method" value={form.payment_method} onChange={onChange} className={fieldInputClass}>{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}</select></FormField>
        <FormField label="Notes"><input name="notes" value={form.notes} onChange={onChange} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-3"><Button disabled={!form.total_cost}>Add Expense</Button></div>
      </form>
    </Card>
    <FinanceTable title="Recent Project Expenses" rows={finance?.project_expenses || []} columns={[
      { key: "expense_date", label: "Date" },
      { key: "title", label: "Expense", render: (row) => <b>{row.title || row.item_name}</b> },
      { key: "category", label: "Category", render: (row) => row.category_model?.group_name || row.category_model?.name || row.category || "-" },
      { key: "paid_to", label: "Paid To", render: (row) => row.supplier?.name || row.paid_by || "-" },
      { key: "payment_method", label: "Method" },
      { key: "amount", label: "Amount", render: (row) => money(row.total_cost || row.amount) },
    ]} />
  </div>;
}

function ProjectFinancePanel({ finance }) {
  const metrics = finance?.metrics || {};
  const money = (value) => formatCurrency(value);

  return <div className="space-y-5">
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric label="Contract Amount" value={money(metrics.contract_amount ?? metrics.expected_revenue)} />
      <Metric label="Revenue Received" value={money(metrics.received_revenue)} />
      <Metric label="Balance Receivable" value={money(metrics.balance_receivable ?? metrics.outstanding_client_balance)} />
      <Metric label="Deposit Amount" value={money(metrics.deposit_amount)} />
      <Metric label="Total Expenses" value={money(metrics.total_project_expenses ?? metrics.project_expenses)} />
      <Metric label="Cash Left" value={money(metrics.cash_left)} />
      <Metric label="Project Profit" value={money(metrics.project_profit)} />
      <Metric label="Profit Margin" value={formatPercentage(metrics.profit_margin)} />
      <Metric label="Payment Progress" value={formatPercentage(metrics.payment_progress ?? metrics.payment_percentage)} />
      <Metric label="Expense Usage" value={formatPercentage(metrics.expense_usage)} />
      <Metric label="Design Costs" value={money(metrics.design_costs)} />
      <Metric label="Materials" value={money(metrics.materials)} />
      <Metric label="Labour Costs" value={money(metrics.labour_costs)} />
      <Metric label="Site Expenses" value={money(metrics.site_expenses)} />
      <Metric label="Other Costs" value={money(metrics.other_project_costs)} />
      <Metric label="Supplier Payables" value={money(metrics.supplier_payables)} />
    </section>

    <Card className="p-5">
      <h3 className="mb-4 font-bold">Payment Stages</h3>
      <Table columns={[
        { key: "name", label: "Stage", render: (stage) => <b>{stage.name}</b> },
        { key: "percentage", label: "%", render: (stage) => formatPercentage(stage.percentage) },
        { key: "amount", label: "Amount", render: (stage) => money(stage.amount) },
        { key: "paid_amount", label: "Paid", render: (stage) => money(stage.paid_amount) },
        { key: "balance", label: "Balance", render: (stage) => money(stage.balance) },
        { key: "due_condition", label: "Due Condition" },
        { key: "status", label: "Status", render: (stage) => <Badge>{stage.status}</Badge> },
      ]} rows={finance?.payment_stages || []} empty="No payment stages yet." />
    </Card>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <FinanceTable title="Project Cost Groups" rows={Object.entries(finance?.expense_breakdown || {}).map(([group, amount]) => ({ group, amount }))} columns={[
        { key: "group", label: "Group", render: (row) => <b>{row.group}</b> },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
      ]} />
      <FinanceTable title="Project Expenses" rows={finance?.project_expenses || []} columns={[
        { key: "expense_date", label: "Date" },
        { key: "title", label: "Item", render: (row) => <b>{row.title || row.item_name}</b> },
        { key: "category", label: "Group", render: (row) => row.category_model?.group_name || row.category_model?.name || row.category || "-" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.name || "-" },
        { key: "total_cost", label: "Amount", render: (row) => money(row.total_cost || row.amount) },
      ]} />
    </section>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <FinanceTable title="Client Payments" rows={finance?.client_payments || []} columns={[
        { key: "payment_date", label: "Date" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        { key: "payment_method", label: "Method" },
        { key: "reference_number", label: "Reference" },
      ]} />
      <FinanceTable title="Client Invoices" rows={finance?.client_invoices || []} columns={[
        { key: "invoice_number", label: "Invoice", render: (row) => <b>{row.invoice_number}</b> },
        { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
        { key: "paid_amount", label: "Paid", render: (row) => money(row.paid_amount) },
        { key: "balance_due", label: "Balance", render: (row) => money(row.balance_due) },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} />
      <FinanceTable title="Supplier Invoices" rows={finance?.supplier_invoices || []} columns={[
        { key: "invoice_number", label: "Invoice", render: (row) => <b>{row.invoice_number}</b> },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.name || "-" },
        { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
        { key: "balance_due", label: "Balance", render: (row) => money(row.balance_due) },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} />
      <FinanceTable title="Supplier Payments" rows={finance?.supplier_payments || []} columns={[
        { key: "payment_date", label: "Date" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.name || "-" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        { key: "payment_method", label: "Method" },
      ]} />
    </section>
  </div>;
}

function FinanceTable({ title, rows, columns }) {
  return <Card className="p-5">
    <h3 className="mb-4 font-bold">{title}</h3>
    <Table columns={columns} rows={rows} empty={`No ${title.toLowerCase()} yet.`} />
  </Card>;
}
