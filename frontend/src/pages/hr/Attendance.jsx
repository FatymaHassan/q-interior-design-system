import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { createManualAttendance, getAttendances, getOfficeLocations } from "../../services/api";
import { todayInSomalia } from "../../utils/dateTime";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

const emptyManual = {
  employee_id: "",
  office_location_id: "",
  date: todayInSomalia(),
  check_in: "",
  check_out: "",
  status: "Present",
  method: "Manual",
  notes: "",
};

export default function Attendance() {
  const { employees, notice } = useHrData(["employees"]);
  const [filters, setFilters] = useState({ employee_id: "", status: "", date_from: "", date_to: todayInSomalia() });
  const [attendances, setAttendances] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [manual, setManual] = useState(emptyManual);
  const [attendanceNotice, setAttendanceNotice] = useState("");
  const [manualNotice, setManualNotice] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    setFilters((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
    setManual((current) => ({ ...current, employee_id: current.employee_id || employees[0]?.id || "" }));
  }, [employees]);

  useEffect(() => {
    getOfficeLocations()
      .then((locations) => {
        setOfficeLocations(locations);
        setManual((current) => ({ ...current, office_location_id: current.office_location_id || locations[0]?.id || "" }));
      })
      .catch(() => setOfficeLocations([]));
  }, []);

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
  const officeOptions = officeLocations.map((office) => <option key={office.id} value={office.id}>{office.name}</option>);
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(filters.employee_id));

  const saveManual = async (event) => {
    event.preventDefault();
    setManualNotice("");
    setSavingManual(true);
    try {
      await createManualAttendance(manual);
      setManual((current) => ({ ...emptyManual, employee_id: current.employee_id, office_location_id: current.office_location_id, date: todayInSomalia() }));
      await loadAttendances();
      setManualNotice("Attendance saved.");
    } catch (error) {
      setManualNotice(apiErrorMessage(error, "Attendance could not be saved."));
    } finally {
      setSavingManual(false);
    }
  };

  return <div className="space-y-6">
    <HRPageHeader title="Attendance" description="Review employee portal check-in and check-out time, office location, GPS distance, and manual HR entries." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}

    <SectionCard title="Create Manual Attendance">
      {manualNotice && <p className={`mb-4 rounded-xl p-3 text-sm font-semibold ${manualNotice.includes("saved") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-brand-danger"}`}>{manualNotice}</p>}
      <form onSubmit={saveManual} className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <select value={manual.employee_id} onChange={(event) => setManual({ ...manual, employee_id: event.target.value })} className={fieldInputClass} required>
          <option value="">Select employee</option>
          {employeeOptions}
        </select>
        <select value={manual.office_location_id} onChange={(event) => setManual({ ...manual, office_location_id: event.target.value })} className={fieldInputClass}>
          <option value="">No office location</option>
          {officeOptions}
        </select>
        <input type="date" value={manual.date} onChange={(event) => setManual({ ...manual, date: event.target.value })} className={fieldInputClass} required />
        <select value={manual.status} onChange={(event) => setManual({ ...manual, status: event.target.value })} className={fieldInputClass}>
          <option>Present</option>
          <option>Late</option>
          <option>Early Out</option>
          <option>Late / Early Out</option>
          <option>Absent</option>
          <option>Half Day</option>
          <option>On Leave</option>
        </select>
        <input type="time" value={manual.check_in} onChange={(event) => setManual({ ...manual, check_in: event.target.value })} className={fieldInputClass} />
        <input type="time" value={manual.check_out} onChange={(event) => setManual({ ...manual, check_out: event.target.value })} className={fieldInputClass} />
        <input value={manual.notes} onChange={(event) => setManual({ ...manual, notes: event.target.value })} className={fieldInputClass} placeholder="Notes" />
        <Button disabled={savingManual}>{savingManual ? "Saving..." : "Save Attendance"}</Button>
      </form>
    </SectionCard>

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
        { key: "total_hours", label: "Hours" },
        { key: "method", label: "Method" },
        { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
      ]} rows={attendances} empty="No attendance records yet." />
    </SectionCard>
  </div>;
}

function formatGps(latitude, longitude, distance) {
  if (!latitude || !longitude) return "-";
  const distanceText = distance !== null && distance !== undefined ? ` (${Number(distance).toFixed(0)}m)` : "";
  return <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline">
    {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}{distanceText}
  </a>;
}

function apiErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors;
  const firstError = errors && Object.values(errors).flat()[0];
  return firstError || error?.response?.data?.message || fallback;
}
