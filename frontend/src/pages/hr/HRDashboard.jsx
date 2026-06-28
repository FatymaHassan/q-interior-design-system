import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function HRDashboard() {
  const { overview, notice } = useHrData(["overview"]);
  const cards = [
    ["Total Employees", overview?.total_employees || 0],
    ["Active Employees", overview?.active_employees || 0],
    ["Present Today", overview?.present_today || 0],
    ["Late Today", overview?.late_today || 0],
    ["Absent Today", overview?.absent_today || 0],
    ["On Leave Today", overview?.on_leave_today || 0],
    ["Pending Leave", overview?.pending_leave_requests || 0],
    ["Payroll Pending", overview?.payroll_pending_approval || 0],
    ["Avg Attendance", `${overview?.average_attendance_percentage || 0}%`],
    ["Avg Late", `${overview?.average_late_percentage || 0}%`],
  ];

  return <div className="space-y-4">
    <HRPageHeader title="HR Management" description="Employee records, attendance, leave, holidays, payroll, salary history, and payslips in one professional workspace." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">{cards.map(([label, value]) => <Card key={label} className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p><b className="mt-1 block text-2xl text-brand-primary">{value}</b></Card>)}</div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard title="Upcoming Holidays"><Table columns={[{ key: "name", label: "Holiday" }, { key: "date", label: "Date" }, { key: "type", label: "Type" }]} rows={overview?.upcoming_holidays || []} empty="No upcoming holidays." /></SectionCard>
      <SectionCard title="Employees by Department"><Table columns={[{ key: "name", label: "Department" }, { key: "employees_count", label: "Employees" }]} rows={overview?.employees_by_department || []} empty="No departments yet." /></SectionCard>
      <SectionCard title="Leave by Type"><Table columns={[{ key: "leave_type", label: "Type" }, { key: "total", label: "Requests" }, { key: "status", label: "Status", render: () => <Badge>Tracked</Badge> }]} rows={overview?.leave_by_type || []} empty="No leave requests yet." /></SectionCard>
    </div>
  </div>;
}
