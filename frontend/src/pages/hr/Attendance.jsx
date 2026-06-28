import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { getAttendances } from "../../services/api";
import { todayInSomalia } from "../../utils/dateTime";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Attendance() {
  const { employees, notice } = useHrData(["employees"]);
  const [filters, setFilters] = useState({ employee_id: "", status: "", date_from: "", date_to: todayInSomalia() });
  const [attendances, setAttendances] = useState([]);
  const [attendanceNotice, setAttendanceNotice] = useState("");

  useEffect(() => {
    setFilters((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  const loadAttendances = () => getAttendances(filters)
    .then((rows) => {
      setAttendances(rows);
      setAttendanceNotice("");
    })
    .catch(() => setAttendanceNotice("Could not load attendance records."));

  useEffect(() => {
    loadAttendances();
  }, [filters.employee_id]);

  const employeeOptions = employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>);
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(filters.employee_id));

  return <div className="space-y-6">
    <HRPageHeader title="Attendance" description="Filter employee GPS attendance, review check-in and check-out times, and track monthly status." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Attendance Records">
      {attendanceNotice && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{attendanceNotice}</p>}
      <form onSubmit={(event) => { event.preventDefault(); loadAttendances(); }} className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <select value={filters.employee_id} onChange={(event) => setFilters({ ...filters, employee_id: event.target.value })} className={fieldInputClass}>
          <option value="">All employees</option>
          {employeeOptions}
        </select>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={fieldInputClass}>
          <option value="">All status</option>
          <option>Present</option>
          <option>Late</option>
          <option>Early Out</option>
          <option>Late / Early Out</option>
          <option>Absent</option>
          <option>Half Day</option>
          <option>On Leave</option>
        </select>
        <input type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} className={fieldInputClass} />
        <input type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} className={fieldInputClass} />
        <Button>Filter</Button>
      </form>
      {selectedEmployee && <p className="mb-3 text-sm font-semibold text-brand-primary">Showing attendance for {selectedEmployee.name}</p>}
      <AttendanceCalendar attendances={attendances} employeeId={filters.employee_id} />
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
    "Early Out": "bg-orange-50 text-orange-700 border-orange-100",
    "Late / Early Out": "bg-orange-50 text-orange-800 border-orange-200",
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
