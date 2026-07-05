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
    <HRPageHeader title="Attendance" description="Review employee portal check-in and check-out time, office location, GPS distance, and status." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}

    <SectionCard title="Employee Portal Check-In / Check-Out Log">
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
      <Table columns={[
        { key: "employee", label: "Employee", render: (row) => row.employee?.name },
        { key: "date", label: "Date" },
        { key: "check_in", label: "Check In" },
        { key: "check_out", label: "Check Out" },
        { key: "office", label: "Location", render: (row) => row.office_location?.name || row.officeLocation?.name || "-" },
        { key: "check_in_location", label: "Entry GPS", render: (row) => formatGps(row.check_in_latitude, row.check_in_longitude, row.check_in_distance_meters) },
        { key: "check_out_location", label: "Leave GPS", render: (row) => formatGps(row.check_out_latitude, row.check_out_longitude, row.check_out_distance_meters) },
        { key: "location_debug", label: "Location Debug", render: (row) => <DebugLocation row={row} /> },
        { key: "total_hours", label: "Hours" },
        { key: "method", label: "Method" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} rows={attendances} empty="No attendance records yet." />
    </SectionCard>
  </div>;
}

function DebugLocation({ row }) {
  const officeLatitude = row.check_in_office_latitude || row.check_out_office_latitude || row.office_location?.latitude || row.officeLocation?.latitude;
  const officeLongitude = row.check_in_office_longitude || row.check_out_office_longitude || row.office_location?.longitude || row.officeLocation?.longitude;
  const radius = row.check_in_allowed_radius_meters || row.check_out_allowed_radius_meters || row.office_location?.allowed_radius_meters || row.officeLocation?.allowed_radius_meters;
  const accuracy = row.check_in_gps_accuracy_meters || row.check_out_gps_accuracy_meters;
  const distance = row.check_in_distance_meters || row.check_out_distance_meters;

  return <div className="min-w-44 text-xs leading-5 text-brand-muted">
    <div>Office: {formatPair(officeLatitude, officeLongitude)}</div>
    <div>Distance: {distance !== null && distance !== undefined ? `${Number(distance).toFixed(0)}m` : "-"}</div>
    <div>Radius: {radius ? `${radius}m` : "-"}</div>
    <div>Accuracy: {accuracy ? `${Number(accuracy).toFixed(0)}m` : "-"}</div>
  </div>;
}

function formatPair(latitude, longitude) {
  if (!latitude || !longitude) return "-";
  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}

function formatGps(latitude, longitude, distance) {
  if (!latitude || !longitude) return "-";
  const distanceText = distance !== null && distance !== undefined ? ` (${Number(distance).toFixed(0)}m)` : "";
  return <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline">
    {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}{distanceText}
  </a>;
}
