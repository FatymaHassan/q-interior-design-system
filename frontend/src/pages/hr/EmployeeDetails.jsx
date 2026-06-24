import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, FileText, Mail, Phone, Shield, Wallet } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { getDocumentStorageUrl, getEmployee, uploadEmployeeDocument } from "../../services/api";
import { fieldInputClass, HRPageHeader, Info } from "./hrShared";

export default function EmployeeDetails() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [status, setStatus] = useState("loading");
  const [documentForm, setDocumentForm] = useState({ title: "", document_type: "Contract", file: null });

  const loadEmployee = () => getEmployee(id)
    .then((profile) => {
      setEmployee(profile.raw);
      setStatus("connected");
    })
    .catch(() => setStatus("error"));

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const submitDocument = async (event) => {
    event.preventDefault();
    if (!documentForm.file) return;
    const form = new FormData();
    form.append("title", documentForm.title || documentForm.file.name);
    form.append("document_type", documentForm.document_type);
    form.append("file", documentForm.file);
    await uploadEmployeeDocument(id, form);
    setDocumentForm({ title: "", document_type: "Contract", file: null });
    event.target.reset();
    loadEmployee();
  };

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading employee...</Card>;
  if (status === "error" || !employee) return <Card className="p-5 text-sm text-brand-danger">Employee could not be loaded.</Card>;

  const documents = employee.documents || [];
  const attendances = employee.attendances || [];
  const leaveBalances = employee.leave_balances || [];
  const payrolls = employee.payrolls || [];
  const salaryHistories = employee.salary_histories || [];

  return <div className="space-y-6">
    <HRPageHeader
      title="Employee Detail"
      description="Modern employee profile with documents, attendance, leave balance, payroll, and salary history."
      action={<div className="flex flex-wrap gap-3"><Link to="/hr/employees"><Button variant="outline">Back to List</Button></Link><Link to={`/hr/employees/${employee.id}/edit`}><Button>Edit Employee</Button></Link></div>}
    />

    <Card className="overflow-hidden">
      <div className="bg-brand-primaryDark px-5 py-6 text-white md:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-3xl font-black">
              {employee.photo ? <img src={getDocumentStorageUrl(employee.photo)} alt={employee.name} className="h-full w-full object-cover" /> : employee.name?.slice(0, 1)}
            </div>
            <div>
              <h2 className="text-3xl font-black">{employee.name}</h2>
              <p className="mt-1 text-sm text-white/70">{employee.position || "No role set"} - {employee.department?.name || "No department"}</p>
              <div className="mt-3 flex flex-wrap gap-2"><Badge>{employee.status}</Badge><Badge>{employee.contract_type || "No contract"}</Badge><Badge>{employee.salary_grade || "No grade"}</Badge></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-80">
            <Metric icon={Wallet} label="Monthly Salary" value={`$${Number(employee.monthly_salary || 0).toLocaleString()}`} />
            <Metric icon={CalendarDays} label="Start Date" value={employee.employment_start_date || "-"} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 text-sm md:grid-cols-4 md:p-6">
        <Info label="Phone" value={employee.phone || "-"} />
        <Info label="Email" value={employee.email || "-"} />
        <Info label="Address" value={employee.address || "-"} />
        <Info label="Emergency" value={`${employee.emergency_contact_name || "-"} ${employee.emergency_contact_phone || ""}`} />
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2">
        <h3 className="mb-4 text-xl font-bold text-brand-primary">HR Documents</h3>
        <form onSubmit={submitDocument} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input placeholder="Document title" value={documentForm.title} onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} className={fieldInputClass} />
          <select value={documentForm.document_type} onChange={(e) => setDocumentForm({ ...documentForm, document_type: e.target.value })} className={fieldInputClass}><option>Contract</option><option>ID document</option><option>Certificates</option><option>CV</option><option>Warning letter</option><option>Promotion letter</option><option>Other</option></select>
          <input type="file" onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })} className={fieldInputClass} />
          <Button>Upload</Button>
        </form>
        <Table columns={[
          { key: "title", label: "Document", render: (row) => <span className="flex items-center gap-2 font-semibold"><FileText size={16} />{row.title}</span> },
          { key: "document_type", label: "Type" },
          { key: "file_type", label: "File" },
          { key: "file_path", label: "Open", render: (row) => row.file_path ? <a className="font-semibold text-brand-primary underline" href={getDocumentStorageUrl(row.file_path)} target="_blank" rel="noreferrer">Open</a> : "-" },
        ]} rows={documents} empty="No employee documents yet." />
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 text-xl font-bold text-brand-primary">Leave Balance</h3>
        <Table columns={[
          { key: "leave_type", label: "Type" },
          { key: "used_days", label: "Taken" },
          { key: "remaining_days", label: "Remain" },
        ]} rows={leaveBalances} empty="No leave balance." />
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-4 text-xl font-bold text-brand-primary">Recent Attendance</h3>
        <Table columns={[
          { key: "date", label: "Date" },
          { key: "check_in", label: "In" },
          { key: "check_out", label: "Out" },
          { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        ]} rows={attendances.slice(0, 8)} empty="No attendance records." />
      </Card>
      <Card className="p-5">
        <h3 className="mb-4 text-xl font-bold text-brand-primary">Payroll Snapshot</h3>
        <Table columns={[
          { key: "month", label: "Month" },
          { key: "year", label: "Year" },
          { key: "net_salary", label: "Net", render: (row) => `$${Number(row.net_salary || 0).toLocaleString()}` },
          { key: "approval_status", label: "Approval", render: (row) => <Badge>{row.approval_status}</Badge> },
        ]} rows={payrolls.slice(0, 8)} empty="No payroll records." />
      </Card>
      <Card className="p-5 xl:col-span-2">
        <h3 className="mb-4 text-xl font-bold text-brand-primary">Salary History</h3>
        <Table columns={[
          { key: "old_salary", label: "Old Salary", render: (row) => `$${Number(row.old_salary || 0).toLocaleString()}` },
          { key: "new_salary", label: "New Salary", render: (row) => `$${Number(row.new_salary || 0).toLocaleString()}` },
          { key: "effective_date", label: "Effective" },
          { key: "reason", label: "Reason" },
        ]} rows={salaryHistories} empty="No salary changes yet." />
      </Card>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-white/10 p-3">
    <div className="flex items-center gap-2 text-white/65"><Icon size={16} />{label}</div>
    <b className="mt-1 block text-lg">{value}</b>
  </div>;
}
