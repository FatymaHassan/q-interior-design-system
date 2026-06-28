import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import { getAttendanceAttemptLogs, getHrAttendanceAnalytics, getOfficeLocations, saveOfficeLocation } from "../../services/api";
import { formatDateTime } from "../../utils/dateTime";

const emptyOffice = { name: "SOMOIL CAR WASH", latitude: "2.0314625", longitude: "45.3122031", allowed_radius_meters: "100", work_start_time: "08:00", work_end_time: "17:00", late_threshold_time: "08:15", status: "Active" };

export default function AttendanceSettings() {
  const [office, setOffice] = useState(emptyOffice);
  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState("");

  const load = () => Promise.all([getOfficeLocations(), getHrAttendanceAnalytics(), getAttendanceAttemptLogs()])
    .then(([locations, analyticsData, logData]) => {
      const current = locations[0];
      if (current) setOffice({
        ...current,
        latitude: current.latitude || "",
        longitude: current.longitude || "",
        allowed_radius_meters: current.allowed_radius_meters || "",
        work_start_time: String(current.work_start_time || "08:00").slice(0, 5),
        work_end_time: String(current.work_end_time || "17:00").slice(0, 5),
        late_threshold_time: String(current.late_threshold_time || "08:15").slice(0, 5),
      });
      setAnalytics(analyticsData);
      setLogs(logData);
    })
    .catch(() => setNotice("Could not load attendance settings."));

  useEffect(() => { load(); }, []);

  const saveOffice = async (event) => {
    event.preventDefault();
    await saveOfficeLocation(office.id, {
      ...office,
      latitude: Number(office.latitude),
      longitude: Number(office.longitude),
      allowed_radius_meters: Number(office.allowed_radius_meters),
    });
    load();
  };

  return <div className="space-y-4">
    <HRPageHeader title="GPS Attendance & Analytics" description="Manage office geofence, attendance attempts, and weekly or monthly attendance percentages." />
    {notice && <p className="rounded-lg bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <section className="grid grid-cols-1 gap-4">
      <SectionCard title="Office Location">
        <form onSubmit={saveOffice} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input value={office.name} onChange={(event) => setOffice({ ...office, name: event.target.value })} className={fieldInputClass} placeholder="Office name" />
          <select value={office.status} onChange={(event) => setOffice({ ...office, status: event.target.value })} className={fieldInputClass}><option>Active</option><option>Inactive</option></select>
          <input value={office.latitude} onChange={(event) => setOffice({ ...office, latitude: event.target.value })} className={fieldInputClass} placeholder="Latitude" />
          <input value={office.longitude} onChange={(event) => setOffice({ ...office, longitude: event.target.value })} className={fieldInputClass} placeholder="Longitude" />
          <input type="number" value={office.allowed_radius_meters} onChange={(event) => setOffice({ ...office, allowed_radius_meters: event.target.value })} className={fieldInputClass} placeholder="Allowed radius meters" />
          <input type="time" value={office.work_start_time} onChange={(event) => setOffice({ ...office, work_start_time: event.target.value })} className={fieldInputClass} />
          <input type="time" value={office.work_end_time} onChange={(event) => setOffice({ ...office, work_end_time: event.target.value })} className={fieldInputClass} />
          <input type="time" value={office.late_threshold_time} onChange={(event) => setOffice({ ...office, late_threshold_time: event.target.value })} className={fieldInputClass} />
          <div className="md:col-span-2"><Button>Save Location</Button></div>
        </form>
      </SectionCard>
    </section>

    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-brand-muted">Average Attendance</p><b className="text-2xl text-brand-primary">{analytics?.averages?.attendance_percentage || 0}%</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Average Late</p><b className="text-2xl text-brand-primary">{analytics?.averages?.late_percentage || 0}%</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Average Absence</p><b className="text-2xl text-brand-primary">{analytics?.averages?.absence_percentage || 0}%</b></Card>
    </section>

    <SectionCard title="Attendance Analytics">
      <Table columns={[{ key: "employee", label: "Employee" }, { key: "department", label: "Department" }, { key: "total_working_days", label: "Working Days" }, { key: "present_days", label: "Present" }, { key: "late_days", label: "Late" }, { key: "absent_days", label: "Absent" }, { key: "leave_days", label: "Leave" }, { key: "attendance_percentage", label: "Attendance %" }, { key: "late_percentage", label: "Late %" }]} rows={analytics?.rows || []} />
    </SectionCard>

    <SectionCard title="Attendance Attempt Logs">
      <Table columns={[{ key: "employee", label: "Employee", render: (row) => row.employee?.name || "-" }, { key: "attempt_type", label: "Type" }, { key: "distance_meters", label: "Distance" }, { key: "success", label: "Success", render: (row) => row.success ? "Yes" : "No" }, { key: "failure_reason", label: "Failure" }, { key: "created_at", label: "Time", render: (row) => row.created_at ? formatDateTime(row.created_at) : "-" }]} rows={logs} />
    </SectionCard>
  </div>;
}
