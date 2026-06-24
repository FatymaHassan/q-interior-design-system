import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { approvePayroll, generatePayroll, getPayslipUrl, markPayrollPaid } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Payroll() {
  const { employees, payrolls, salaryHistories, notice, reload } = useHrData(["employees", "payrolls", "salaryHistories"]);
  const [payrollForm, setPayrollForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), employee_id: "", bonus: 0, overtime_amount: 0, deduction: 0 });

  useEffect(() => {
    setPayrollForm((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);

  return <div className="space-y-6">
    <HRPageHeader title="Payroll" description="Auto-calculate monthly salary from attendance records, add bonuses, deductions, overtime, approve payroll, and generate payslips." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Generate Payroll">
      <form onSubmit={async (e) => { e.preventDefault(); await generatePayroll({ ...payrollForm, month: Number(payrollForm.month), year: Number(payrollForm.year), employee_id: payrollForm.employee_id ? Number(payrollForm.employee_id) : null, bonus: Number(payrollForm.bonus || 0), overtime_amount: Number(payrollForm.overtime_amount || 0), deduction: Number(payrollForm.deduction || 0) }); reload(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-6">
        <select value={payrollForm.employee_id} onChange={(e) => setPayrollForm({ ...payrollForm, employee_id: e.target.value })} className={fieldInputClass}><option value="">All employees</option>{employeeOptions}</select>
        <input type="number" min="1" max="12" value={payrollForm.month} onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })} className={fieldInputClass} />
        <input type="number" value={payrollForm.year} onChange={(e) => setPayrollForm({ ...payrollForm, year: e.target.value })} className={fieldInputClass} />
        <input type="number" placeholder="Bonus" value={payrollForm.bonus} onChange={(e) => setPayrollForm({ ...payrollForm, bonus: e.target.value })} className={fieldInputClass} />
        <input type="number" placeholder="Overtime" value={payrollForm.overtime_amount} onChange={(e) => setPayrollForm({ ...payrollForm, overtime_amount: e.target.value })} className={fieldInputClass} />
        <input type="number" placeholder="Deduction" value={payrollForm.deduction} onChange={(e) => setPayrollForm({ ...payrollForm, deduction: e.target.value })} className={fieldInputClass} />
        <Button>Generate Payroll</Button>
      </form>
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "month", label: "Month" },
        { key: "year", label: "Year" },
        { key: "net_salary", label: "Net Salary", render: (row) => `$${Number(row.net_salary || 0).toLocaleString()}` },
        { key: "approval_status", label: "Approval", render: (row) => <Badge>{row.approval_status}</Badge> },
        { key: "payment_status", label: "Payment", render: (row) => <Badge>{row.payment_status}</Badge> },
        { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><Button className="px-3 py-2" onClick={() => approvePayroll(row.id).then(reload)}>Approve</Button><Button variant="outline" className="px-3 py-2" onClick={() => markPayrollPaid(row.id, { payment_method: "bank transfer" }).then(reload)}>Mark Paid</Button><a href={getPayslipUrl(row.id)} download><Button variant="outline" className="px-3 py-2">Payslip PDF</Button></a></div> },
      ]} rows={payrolls} empty="No payroll records yet." />
    </SectionCard>
    <SectionCard title="Salary History">
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "old_salary", label: "Old Salary", render: (row) => `$${Number(row.old_salary || 0).toLocaleString()}` },
        { key: "new_salary", label: "New Salary", render: (row) => `$${Number(row.new_salary || 0).toLocaleString()}` },
        { key: "effective_date", label: "Effective Date" },
        { key: "reason", label: "Reason" },
      ]} rows={salaryHistories} empty="No salary changes yet." />
    </SectionCard>
  </div>;
}
