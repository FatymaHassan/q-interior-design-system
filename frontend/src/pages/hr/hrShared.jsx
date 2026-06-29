import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import { getDocumentStorageUrl } from "../../services/api";

export const fieldInputClass = "w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";

export const emptyEmployee = {
  name: "",
  department_id: "",
  position: "",
  photo: null,
  phone: "",
  email: "",
  password: "",
  password_confirmation: "",
  address: "",
  employment_start_date: "",
  contract_type: "Full Time",
  salary_grade: "",
  monthly_salary: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  status: "Active",
  notes: "",
};

export function HRPageHeader({ eyebrow = "HR Management", title, description, action }) {
  return <Card className="px-5 py-4 md:px-6 md:py-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-gold">{eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary md:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-brand-muted">{description}</p>
    </div>
    {action}
    </div>
  </Card>;
}

export function SectionCard({ title, children }) {
  return <Card className="p-4 md:p-5"><h2 className="mb-3 text-lg font-bold text-brand-primary">{title}</h2>{children}</Card>;
}

export function Info({ label, value }) {
  return <div className="rounded-xl bg-brand-soft p-3"><span className="text-brand-muted">{label}</span><b className="mt-1 block">{value}</b></div>;
}

export function EmployeeTable({ employees, onView, onEdit, onDelete }) {
  return <Table columns={[
    { key: "name", label: "Name", render: (employee) => <button className="font-bold text-brand-primary underline" onClick={() => onView(employee)}>{employee.name}</button> },
    { key: "department", label: "Department" },
    { key: "position", label: "Role" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Contact" },
    { key: "status", label: "Status", render: (employee) => <Badge>{employee.status}</Badge> },
    { key: "actions", label: "Actions", render: (employee) => <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="px-3 py-2" onClick={() => onView(employee)}>View</Button>
      <Button variant="outline" className="px-3 py-2" onClick={() => onEdit ? onEdit(employee) : onView(employee)}>Edit</Button>
      <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => onDelete(employee)}>Delete</Button>
    </div> },
  ]} rows={employees} empty="No employees yet." />;
}

export function EmployeeProfile({ employee, documentForm, setDocumentForm, submitDocument }) {
  const documents = employee.documents || [];
  return <Card className="p-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-soft text-2xl font-black text-brand-primary">
          {employee.photo ? <img src={getDocumentStorageUrl(employee.photo)} alt={employee.name} className="h-full w-full object-cover" /> : employee.name?.slice(0, 1)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-primary">{employee.name}</h2>
          <p className="text-sm text-brand-muted">{employee.position || "-"} - {employee.department?.name || "-"}</p>
        </div>
      </div>
      <Badge>{employee.status}</Badge>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
      <Info label="Salary" value={`$${Number(employee.monthly_salary || 0).toLocaleString()}`} />
      <Info label="Contract" value={employee.contract_type || "-"} />
      <Info label="Salary Grade" value={employee.salary_grade || "-"} />
      <Info label="Start Date" value={employee.employment_start_date || "-"} />
      <Info label="Phone" value={employee.phone || "-"} />
      <Info label="Email" value={employee.email || "-"} />
      <Info label="Emergency" value={`${employee.emergency_contact_name || "-"} ${employee.emergency_contact_phone || ""}`} />
      <Info label="Leave Balances" value={(employee.leave_balances || []).map((item) => `${item.leave_type}: ${item.remaining_days}`).join(", ") || "-"} />
    </div>

    <form onSubmit={submitDocument} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <input placeholder="Document title" value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} className={fieldInputClass} />
      <select value={documentForm.document_type} onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })} className={fieldInputClass}><option>Contract</option><option>ID document</option><option>Certificates</option><option>CV</option><option>Warning letter</option><option>Promotion letter</option><option>Other</option></select>
      <input type="file" onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} className={fieldInputClass} />
      <Button>Upload</Button>
    </form>
    <div className="mt-5"><Table columns={[
      { key: "title", label: "Document" },
      { key: "document_type", label: "Type" },
      { key: "file_type", label: "File" },
      { key: "file_path", label: "Open", render: (row) => row.file_path ? <a className="font-semibold text-brand-primary underline" href={getDocumentStorageUrl(row.file_path)} target="_blank" rel="noreferrer">Open</a> : "-" },
    ]} rows={documents} empty="No employee documents yet." /></div>
  </Card>;
}
