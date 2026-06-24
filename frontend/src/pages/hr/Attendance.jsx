import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { checkIn, checkOut, createManualAttendance } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Attendance() {
  const { employees, attendances, notice, reload } = useHrData(["employees", "attendances"]);
  const [attendanceForm, setAttendanceForm] = useState({ employee_id: "", date: new Date().toISOString().slice(0, 10), check_in: "09:00", check_out: "17:00", status: "Present", notes: "" });

  useEffect(() => {
    setAttendanceForm((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);

  return <div className="space-y-6">
    <HRPageHeader title="Attendance" description="Manual daily check-in/check-out, QR-ready status tracking, and a monthly calendar per employee." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Daily Attendance">
      <form onSubmit={async (e) => { e.preventDefault(); await createManualAttendance(attendanceForm); reload(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-6">
        <select value={attendanceForm.employee_id} onChange={(e) => setAttendanceForm({ ...attendanceForm, employee_id: e.target.value })} className={fieldInputClass}>{employeeOptions}</select>
        <input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} className={fieldInputClass} />
        <input type="time" value={attendanceForm.check_in} onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in: e.target.value })} className={fieldInputClass} />
        <input type="time" value={attendanceForm.check_out} onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out: e.target.value })} className={fieldInputClass} />
        <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })} className={fieldInputClass}><option>Present</option><option>Late</option><option>Absent</option><option>Half Day</option><option>On Leave</option></select>
        <Button>Manual Entry</Button>
      </form>
      <div className="mb-5 flex gap-2"><Button type="button" onClick={async () => { await checkIn(attendanceForm.employee_id); reload(); }}>Check In</Button><Button type="button" variant="outline" onClick={async () => { await checkOut(attendanceForm.employee_id); reload(); }}>Check Out</Button></div>
      <AttendanceCalendar attendances={attendances} employeeId={attendanceForm.employee_id} />
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "date", label: "Date" },
        { key: "check_in", label: "Check In" },
        { key: "check_out", label: "Check Out" },
        { key: "total_hours", label: "Hours" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} rows={attendances} empty="No attendance records yet." />
    </SectionCard>
  </div>;
}

function AttendanceCalendar({ attendances, employeeId }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const attendance = attendances.find((item) => String(item.employee_id) === String(employeeId) && String(item.date).slice(0, 10) === date);
    return { date, status: attendance?.status || "No Entry", check_in: attendance?.check_in || "-", check_out: attendance?.check_out || "-" };
  });
  const colors = {
    Present: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Late: "bg-amber-50 text-amber-700 border-amber-100",
    Absent: "bg-red-50 text-red-700 border-red-100",
    "Half Day": "bg-blue-50 text-blue-700 border-blue-100",
    "On Leave": "bg-purple-50 text-purple-700 border-purple-100",
    "No Entry": "bg-brand-soft text-brand-muted border-brand-border",
  };

  return <div className="mb-5 rounded-xl border border-brand-border bg-white p-4">
    <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-brand-primary">Monthly Attendance Calendar</h3><span className="text-sm text-brand-muted">{monthStart.toLocaleString(undefined, { month: "long", year: "numeric" })}</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {rows.map((row) => <div key={row.date} className={`min-h-20 rounded-xl border p-2 text-xs ${colors[row.status] || colors["No Entry"]}`}><b>{Number(row.date.slice(-2))}</b><p className="mt-1 font-semibold">{row.status}</p><p className="mt-1">{row.check_in} - {row.check_out}</p></div>)}
    </div>
  </div>;
}
