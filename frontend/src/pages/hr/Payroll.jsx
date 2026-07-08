import { useEffect, useState } from "react";
import { Check, Download, Edit3, FileSpreadsheet, FileText, Plus, Trash2, WalletCards } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { approvePayroll, deletePayroll, downloadPayrollExport, generatePayroll, getPayslipUrl, markPayrollPaid, updatePayroll } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

const currentDate = new Date();
const emptyPayrollForm = {
  month: currentDate.getMonth() + 1,
  year: currentDate.getFullYear(),
  employee_id: "",
  bonus: 0,
  overtime_amount: 0,
  deduction: 0,
  payment_date: "",
  payment_method: "bank transfer",
};
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2026, index, 1).toLocaleString("default", { month: "long" }),
}));

export default function Payroll() {
  const { employees, payrolls, notice, reload } = useHrData(["employees", "payrolls"]);
  const [payrollForm, setPayrollForm] = useState(emptyPayrollForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [filters, setFilters] = useState({ employee_id: "", month: "", month_from: "", month_to: "", year: "", approval_status: "", payment_status: "" });

  useEffect(() => {
    setPayrollForm((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  const selectedEmployee = employees.find((employee) => String(employee.id) === String(payrollForm.employee_id));
  const monthlySalary = Number(selectedEmployee?.raw?.monthly_salary || selectedEmployee?.monthlySalary || 0);
  const previewNetSalary = monthlySalary + Number(payrollForm.bonus || 0) + Number(payrollForm.overtime_amount || 0) - Number(payrollForm.deduction || 0);
  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);
  const filteredPayrolls = payrolls.filter((row) => {
    if (filters.employee_id && String(row.employee_id) !== String(filters.employee_id)) return false;
    if (filters.month && String(row.month) !== String(filters.month)) return false;
    if (filters.month_from && Number(row.month) < Number(filters.month_from)) return false;
    if (filters.month_to && Number(row.month) > Number(filters.month_to)) return false;
    if (filters.year && String(row.year) !== String(filters.year)) return false;
    if (filters.approval_status && row.approval_status !== filters.approval_status) return false;
    if (filters.payment_status && row.payment_status !== filters.payment_status) return false;
    return true;
  });
  const totals = filteredPayrolls.reduce((summary, row) => ({
    count: summary.count + 1,
    net: summary.net + Number(row.net_salary || 0),
    paid: summary.paid + (row.payment_status === "Paid" ? Number(row.net_salary || 0) : 0),
    unpaid: summary.unpaid + (row.payment_status !== "Paid" ? Number(row.net_salary || 0) : 0),
  }), { count: 0, net: 0, paid: 0, unpaid: 0 });

  const openCreate = () => {
    setEditingPayroll(null);
    setPayrollForm({ ...emptyPayrollForm, employee_id: employees[0]?.id || "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingPayroll(row);
    setPayrollForm({
      employee_id: row.employee_id || row.employee?.id || "",
      month: row.month || currentDate.getMonth() + 1,
      year: row.year || currentDate.getFullYear(),
      bonus: row.bonus || 0,
      overtime_amount: row.overtime_amount || 0,
      deduction: row.deduction || 0,
      payment_date: row.payment_date || "",
      payment_method: row.payment_method || "bank transfer",
    });
    setModalOpen(true);
  };

  const submitPayroll = async (event) => {
    event.preventDefault();
    const payload = {
      ...payrollForm,
      month: Number(payrollForm.month),
      year: Number(payrollForm.year),
      employee_id: payrollForm.employee_id ? Number(payrollForm.employee_id) : null,
      bonus: Number(payrollForm.bonus || 0),
      overtime_amount: Number(payrollForm.overtime_amount || 0),
      deduction: Number(payrollForm.deduction || 0),
      payment_date: payrollForm.payment_date || null,
      payment_method: payrollForm.payment_method || null,
    };
    editingPayroll ? await updatePayroll(editingPayroll.id, payload) : await generatePayroll(payload);
    await reload();
    setModalOpen(false);
    setEditingPayroll(null);
  };

  const removePayroll = async (row) => {
    if (!window.confirm(`Delete payroll for ${row.employee?.name || "this employee"}?`)) return;
    await deletePayroll(row.id);
    reload();
  };

  const cleanFilters = () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));

  return <div className="space-y-6">
    <HRPageHeader
      title="Monthly Payroll"
      description="Prepare employee monthly salary, then add bonus, overtime, or deductions."
      action={<Button onClick={openCreate} className="gap-2"><Plus size={16} />Add Payroll</Button>}
    />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Payroll List">
      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <PayrollMetric label="Records" value={totals.count} />
        <PayrollMetric label="Total Net Salary" value={`$${totals.net.toLocaleString()}`} />
        <PayrollMetric label="Paid" value={`$${totals.paid.toLocaleString()}`} />
        <PayrollMetric label="Unpaid" value={`$${totals.unpaid.toLocaleString()}`} />
      </section>
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <form className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <select value={filters.employee_id} onChange={(event) => setFilters({ ...filters, employee_id: event.target.value })} className={fieldInputClass}>
          <option value="">All employees</option>
          {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
        <select value={filters.month_from} onChange={(event) => setFilters({ ...filters, month_from: event.target.value, month: "" })} className={fieldInputClass}>
          <option value="">From month</option>
          {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>
        <select value={filters.month_to} onChange={(event) => setFilters({ ...filters, month_to: event.target.value, month: "" })} className={fieldInputClass}>
          <option value="">To month</option>
          {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>
        <input type="number" placeholder="Year" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className={fieldInputClass} />
        <select value={filters.approval_status} onChange={(event) => setFilters({ ...filters, approval_status: event.target.value })} className={fieldInputClass}>
          <option value="">All approval</option>
          <option>Prepared</option>
          <option>Approved</option>
          <option>Paid</option>
        </select>
        <select value={filters.payment_status} onChange={(event) => setFilters({ ...filters, payment_status: event.target.value })} className={fieldInputClass}>
          <option value="">All payment</option>
          <option>Unpaid</option>
          <option>Paid</option>
        </select>
      </form>
      <div className="flex flex-wrap gap-2">
        <IconButton label="Export Excel" onClick={() => downloadPayrollExport("excel", cleanFilters())}><FileSpreadsheet size={16} /></IconButton>
        <IconButton label="Export PDF" onClick={() => downloadPayrollExport("pdf", cleanFilters())}><FileText size={16} /></IconButton>
      </div>
      </div>
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => <div className="min-w-[150px]"><b className="text-brand-primary">{row.employee?.name || "Employee"}</b><p className="text-xs text-brand-muted">{row.employee?.position || row.employee?.department?.name || "-"}</p></div> },
        { key: "period", label: "Period", render: (row) => <span className="whitespace-nowrap">{monthOptions.find((month) => Number(month.value) === Number(row.month))?.label || row.month} {row.year}</span> },
        { key: "base_salary", label: "Monthly", render: (row) => money(row.base_salary) },
        { key: "bonus", label: "Bonus", render: (row) => money(row.bonus) },
        { key: "overtime_amount", label: "Overtime", render: (row) => money(row.overtime_amount) },
        { key: "deduction", label: "Deduction", render: (row) => money(row.deduction) },
        { key: "net_salary", label: "Net", render: (row) => <b className="text-brand-primary">{money(row.net_salary)}</b> },
        { key: "payment_date", label: "Paid Date", render: (row) => <span className="whitespace-nowrap">{row.payment_date || "-"}</span> },
        { key: "approval_status", label: "Approval", render: (row) => <Badge>{row.approval_status}</Badge> },
        { key: "payment_status", label: "Payment", render: (row) => <Badge>{row.payment_status}</Badge> },
        { key: "actions", label: "Actions", render: (row) => <div className="flex min-w-[188px] flex-wrap gap-2">
          <IconButton label="Edit payroll" onClick={() => openEdit(row)}><Edit3 size={15} /></IconButton>
          <IconButton label="Delete payroll" danger onClick={() => removePayroll(row)}><Trash2 size={15} /></IconButton>
          {row.approval_status !== "Approved" && row.approval_status !== "Paid" && <IconButton label="Approve payroll" onClick={() => approvePayroll(row.id).then(reload)}><Check size={15} /></IconButton>}
          {row.payment_status !== "Paid" && <IconButton label="Mark paid" onClick={() => markPayrollPaid(row.id, { payment_method: "bank transfer" }).then(reload)}><WalletCards size={15} /></IconButton>}
          <a href={getPayslipUrl(row.id)} download title="Download payslip"><IconButton as="span" label="Download payslip"><Download size={15} /></IconButton></a>
        </div> },
      ]} rows={filteredPayrolls} empty="No payroll records found." />
    </SectionCard>
    <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingPayroll(null); }} title={editingPayroll ? "Edit Payroll" : "Add Payroll"}>
      <form onSubmit={submitPayroll} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Employee
          <select value={payrollForm.employee_id} onChange={(event) => setPayrollForm({ ...payrollForm, employee_id: event.target.value })} className={`${fieldInputClass} mt-1`} required>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
        </label>
        <label className="text-sm font-semibold">Month
          <select value={payrollForm.month} onChange={(event) => setPayrollForm({ ...payrollForm, month: event.target.value })} className={`${fieldInputClass} mt-1`}>
            {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Year
          <input type="number" value={payrollForm.year} onChange={(event) => setPayrollForm({ ...payrollForm, year: event.target.value })} className={`${fieldInputClass} mt-1`} />
        </label>
        <div className="rounded-xl border border-brand-border bg-brand-soft px-3 py-2 text-sm">
          <span className="block text-xs font-bold uppercase tracking-wide text-brand-muted">Monthly salary</span>
          <b>${monthlySalary.toLocaleString()}</b>
        </div>
        <label className="text-sm font-semibold">Bonus
          <input type="number" min="0" step="0.01" value={payrollForm.bonus} onChange={(event) => setPayrollForm({ ...payrollForm, bonus: event.target.value })} className={`${fieldInputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Overtime amount
          <input type="number" min="0" step="0.01" value={payrollForm.overtime_amount} onChange={(event) => setPayrollForm({ ...payrollForm, overtime_amount: event.target.value })} className={`${fieldInputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Deduction
          <input type="number" min="0" step="0.01" value={payrollForm.deduction} onChange={(event) => setPayrollForm({ ...payrollForm, deduction: event.target.value })} className={`${fieldInputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Payment date
          <input type="date" value={payrollForm.payment_date} onChange={(event) => setPayrollForm({ ...payrollForm, payment_date: event.target.value })} className={`${fieldInputClass} mt-1`} />
        </label>
        <label className="text-sm font-semibold">Payment method
          <select value={payrollForm.payment_method} onChange={(event) => setPayrollForm({ ...payrollForm, payment_method: event.target.value })} className={`${fieldInputClass} mt-1`}>
            <option value="bank transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="EVC Plus">EVC Plus</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm">
          <span className="block text-xs font-bold uppercase tracking-wide text-brand-muted">Net salary</span>
          <b>${previewNetSalary.toLocaleString()}</b>
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button>{editingPayroll ? "Update Payroll" : "Save Payroll"}</Button>
        </div>
      </form>
    </Modal>
  </div>;
}

function PayrollMetric({ label, value }) {
  return <div className="rounded-xl border border-brand-border bg-white p-4 shadow-sm">
    <span className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</span>
    <b className="mt-1 block text-xl text-brand-primary">{value}</b>
  </div>;
}

function IconButton({ children, label, danger = false, as: Component = "button", ...props }) {
  return <Component
    type={Component === "button" ? "button" : undefined}
    title={label}
    aria-label={label}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-white transition hover:border-brand-gold hover:bg-brand-soft ${danger ? "text-brand-danger" : "text-brand-primary"}`}
    {...props}
  >
    {children}
  </Component>;
}

const money = (value) => `$${Number(value || 0).toLocaleString()}`;
