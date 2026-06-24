import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { approveLeave, createLeaveRequest, rejectLeave } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Leave() {
  const { employees, leaveRequests, leaveBalances, notice, reload } = useHrData(["employees", "leaveRequests", "leaveBalances"]);
  const [leaveForm, setLeaveForm] = useState({ employee_id: "", leave_type: "Annual Leave", start_date: "", end_date: "", reason: "" });

  useEffect(() => {
    setLeaveForm((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);

  return <div className="space-y-6">
    <HRPageHeader title="Attendance & Leave" description="Submit leave requests, approve or reject in one click, and track days taken versus remaining." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Leave Requests">
      <form onSubmit={async (e) => { e.preventDefault(); await createLeaveRequest(leaveForm); reload(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
        <select value={leaveForm.employee_id} onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })} className={fieldInputClass}>{employeeOptions}</select>
        <select value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className={fieldInputClass}><option>Annual Leave</option><option>Sick Leave</option><option>Unpaid Leave</option><option>Emergency Leave</option><option>Maternity Leave</option><option>Other</option></select>
        <input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className={fieldInputClass} />
        <input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className={fieldInputClass} />
        <Button>Request Leave</Button>
      </form>
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "leave_type", label: "Type" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
        { key: "total_days", label: "Days" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
        { key: "actions", label: "Actions", render: (row) => row.status === "Pending" ? <div className="flex gap-2"><Button className="px-3 py-2" onClick={() => approveLeave(row.id).then(reload)}>Approve</Button><Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => rejectLeave(row.id, "Rejected from HR").then(reload)}>Reject</Button></div> : "-" },
      ]} rows={leaveRequests} empty="No leave requests yet." />
    </SectionCard>
    <SectionCard title="Leave Balance Tracker">
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "year", label: "Year" },
        { key: "leave_type", label: "Type" },
        { key: "total_allowed_days", label: "Allowed" },
        { key: "used_days", label: "Taken" },
        { key: "remaining_days", label: "Remaining" },
      ]} rows={leaveBalances} empty="No leave balances yet." />
    </SectionCard>
  </div>;
}
