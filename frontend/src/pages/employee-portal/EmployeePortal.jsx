import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CheckCircle2, Clock, FileText, Home, MapPin } from "lucide-react";
import Button from "../../components/ui/Button";
import { PortalCard, PortalEmptyState, PortalSectionHeader, PortalShell, PortalSkeleton, PortalStatCard, PortalStatusBadge } from "../../components/portal/PortalShell";
import { employeeCheckIn, employeeCheckOut, employeePortalLogout, getEmployeePortalAttendance, getEmployeePortalDashboard, getEmployeePortalReviews } from "../../services/api";
import { todayInSomalia } from "../../utils/dateTime";

const navItems = [
  { key: "Dashboard", label: "Home", icon: Home },
  { key: "Check In", label: "Check In", icon: MapPin },
  { key: "Attendance", label: "Attendance", icon: CalendarDays },
  { key: "Reviews", label: "Reviews", icon: FileText },
];

export default function EmployeePortal() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], goals: [] });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return Promise.all([
      getEmployeePortalDashboard(),
      getEmployeePortalAttendance(),
      getEmployeePortalReviews(),
    ]).then(([dashboard, attendanceData, reviewData]) => {
      setData(dashboard);
      setAttendance(attendanceData);
      setReviews(reviewData);
      setNotice("");
    }).catch((error) => setNotice(error.response?.data?.message || "Employee portal data could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const signOut = async () => {
    await employeePortalLogout();
    navigate("/login", { replace: true });
  };

  return <PortalShell
    title="Employee Portal"
    subtitle="Self-service HR"
    userName={data?.employee?.name}
    navItems={navItems}
    active={active}
    onNavigate={setActive}
    onLogout={signOut}
    notificationCount={0}
  >
    {notice && <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{notice}</p>}
    {loading && !data ? <PortalSkeleton /> : <>
      {active === "Dashboard" && <Dashboard dashboard={data} />}
      {active === "Check In" && <CheckInPanel today={data?.today_attendance} employee={data?.employee} onDone={load} />}
      {active === "Attendance" && <AttendancePanel attendance={attendance} />}
      {active === "Reviews" && <ReviewPanel data={reviews} />}
    </>}
  </PortalShell>;
}

function Dashboard({ dashboard }) {
  const summary = dashboard?.attendance_summary || {};
  const today = dashboard?.today_attendance;

  return <div className="space-y-5">
    <PortalCard className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700">Welcome back</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{dashboard?.employee?.name || "Employee"}</h1>
          <p className="mt-1 text-sm text-slate-500">{dashboard?.employee?.position || "Staff"} {dashboard?.employee?.department?.name ? `- ${dashboard.employee.department.name}` : ""}</p>
        </div>
        <div className="rounded-lg bg-slate-950 px-4 py-3 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-slate-300">Today</p>
          <p className="mt-1 text-lg font-black">{todayInSomalia()}</p>
        </div>
      </div>
    </PortalCard>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PortalStatCard icon={CheckCircle2} label="Today" value={today?.status || "No entry"} helper={`${today?.check_in || "-"} to ${today?.check_out || "-"}`} tone="green" />
      <PortalStatCard icon={BarChart3} label="Attendance" value={`${summary.attendance_percentage || 0}%`} helper="This month" tone="blue" />
      <PortalStatCard icon={Clock} label="Late" value={`${summary.late_percentage || 0}%`} helper={`${summary.late_days || 0} late days`} tone="amber" />
      <PortalStatCard icon={Clock} label="Early Out" value={summary.early_out_days || 0} helper="This month" tone="slate" />
    </section>

    <section className="grid grid-cols-1 gap-4">
      <PortalCard className="p-5">
        <PortalSectionHeader title="Today Attendance" subtitle="GPS attendance status and working hours" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoTile label="Status" value={<PortalStatusBadge>{today?.status || "No entry"}</PortalStatusBadge>} />
          <InfoTile label="Check In" value={today?.check_in || "-"} />
          <InfoTile label="Check Out" value={today?.check_out || "-"} />
          <InfoTile label="Hours" value={today?.total_hours || "0.00"} />
        </div>
      </PortalCard>
    </section>
  </div>;
}

function CheckInPanel({ today, employee, onDone }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [debug, setDebug] = useState(null);

  const submit = async (type) => {
    if (!navigator.geolocation) {
      setMessage("Please allow location permission to mark attendance.");
      return;
    }
    setBusy(type);
    setMessage("Checking your location...");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          gps_accuracy_meters: position.coords.accuracy,
        };
        if (position.coords.accuracy > 100) {
          setMessage("Your GPS accuracy is low. Please move to an open area or try again.");
        }
        const result = type === "check_in" ? await employeeCheckIn(payload) : await employeeCheckOut(payload);
        setMessage(result.message);
        setDebug(result.debug || {
          user_latitude: payload.latitude,
          user_longitude: payload.longitude,
          gps_accuracy_meters: payload.gps_accuracy_meters,
        });
        onDone();
      } catch (error) {
        setMessage(error.response?.data?.message || "Something went wrong while saving attendance.");
        setDebug(error.response?.data?.debug || null);
      } finally {
        setBusy("");
      }
    }, () => {
      setMessage("Please allow location permission to mark attendance.");
      setBusy("");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  return <div className="space-y-5">
    <PortalCard className="p-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><MapPin size={22} /></span>
            <div>
              <h1 className="text-xl font-black text-slate-950">GPS Check In / Check Out</h1>
              <p className="text-sm text-slate-500">Allow location permission and stay inside the office radius.</p>
            </div>
          </div>
          {message && <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoTile label="Status" value={<PortalStatusBadge>{today?.status || "No entry"}</PortalStatusBadge>} />
            <InfoTile label="Check In" value={today?.check_in || "-"} />
            <InfoTile label="Check Out" value={today?.check_out || "-"} />
            <InfoTile label="Hours" value={today?.total_hours || "0.00"} />
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => submit("check_in")} disabled={Boolean(busy)} className="min-h-12 flex-1 gap-2"><CheckCircle2 size={18} />{busy === "check_in" ? "Checking..." : "Check In"}</Button>
            <Button variant="outline" onClick={() => submit("check_out")} disabled={Boolean(busy)} className="min-h-12 flex-1 gap-2"><Clock size={18} />{busy === "check_out" ? "Checking..." : "Check Out"}</Button>
          </div>
          {debug && <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <InfoTile label="Office GPS" value={debug.office_latitude && debug.office_longitude ? `${Number(debug.office_latitude).toFixed(7)}, ${Number(debug.office_longitude).toFixed(7)}` : "-"} />
            <InfoTile label="Your GPS" value={debug.user_latitude && debug.user_longitude ? `${Number(debug.user_latitude).toFixed(7)}, ${Number(debug.user_longitude).toFixed(7)}` : "-"} />
            <InfoTile label="Distance" value={debug.distance_meters !== null && debug.distance_meters !== undefined ? `${Number(debug.distance_meters).toFixed(0)} m` : "-"} />
            <InfoTile label="Allowed Radius" value={debug.allowed_radius_meters ? `${debug.allowed_radius_meters} m` : "-"} />
            <InfoTile label="GPS Accuracy" value={debug.gps_accuracy_meters ? `${Number(debug.gps_accuracy_meters).toFixed(0)} m` : "-"} />
            <InfoTile label="Office" value={debug.office_name || "-"} />
          </div>}
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Employee</p>
          <p className="mt-2 text-lg font-black text-slate-950">{employee?.name || "-"}</p>
          <p className="mt-1 text-sm text-slate-500">{employee?.position || "Staff"}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Location permission is required.</p>
            <p>Outside office attempts are recorded for HR review.</p>
          </div>
        </div>
      </div>
    </PortalCard>
  </div>;
}

function AttendancePanel({ attendance }) {
  const summary = attendance?.summary || {};
  const items = attendance?.items || [];
  return <div className="space-y-5">
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <PortalStatCard icon={CheckCircle2} label="Present" value={summary.present_days || 0} tone="green" />
      <PortalStatCard icon={Clock} label="Late" value={summary.late_days || 0} tone="amber" />
      <PortalStatCard icon={Clock} label="Early Out" value={summary.early_out_days || 0} tone="amber" />
      <PortalStatCard icon={BarChart3} label="Attendance" value={`${summary.attendance_percentage || 0}%`} tone="slate" />
    </section>
    <PortalCard className="p-5">
      <PortalSectionHeader title="My Attendance" subtitle="Recent attendance records" />
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {items.map((row) => <AttendanceCard key={row.id} row={row} />)}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2">Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th><th>Late</th></tr></thead>
          <tbody>{items.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-3 font-bold">{row.date}</td><td>{row.check_in || "-"}</td><td>{row.check_out || "-"}</td><td>{row.total_hours || "0.00"}</td><td><PortalStatusBadge>{row.status}</PortalStatusBadge></td><td>{row.late_minutes || 0} min</td></tr>)}</tbody>
        </table>
      </div>
      {items.length === 0 && <PortalEmptyState title="No attendance records yet" description="Your attendance will appear after check in." />}
    </PortalCard>
  </div>;
}

function AttendanceCard({ row }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{row.date}</p><PortalStatusBadge>{row.status}</PortalStatusBadge></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><InfoTile label="In" value={row.check_in || "-"} /><InfoTile label="Out" value={row.check_out || "-"} /><InfoTile label="Hours" value={row.total_hours || "0.00"} /></div>
  </div>;
}

function ReviewPanel({ data }) {
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Performance Reviews" subtitle="Scores and manager comments" />
      <div className="space-y-3">
        {(data?.reviews || []).map((review) => <div key={review.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-950">{review.review_period}</p><p className="mt-1 text-sm text-slate-500">Rating: {review.overall_rating || "-"}</p></div><PortalStatusBadge>{review.status}</PortalStatusBadge></div>
          <p className="mt-3 text-sm text-slate-600">{review.manager_comments || "No manager comments yet."}</p>
        </div>)}
        {(data?.reviews || []).length === 0 && <PortalEmptyState title="No reviews yet" description="Performance reviews will appear here." />}
      </div>
    </PortalCard>
    <PortalCard className="p-5">
      <PortalSectionHeader title="Goals" subtitle="Current goals and progress" />
      <div className="space-y-3">
        {(data?.goals || []).map((goal) => <div key={goal.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2"><p className="font-black text-slate-950">{goal.title}</p><PortalStatusBadge>{goal.status}</PortalStatusBadge></div>
          <p className="mt-2 text-sm text-slate-500">{goal.description || "No description"}</p>
          <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(Number(goal.progress || 0), 100)}%` }} /></div>
        </div>)}
        {(data?.goals || []).length === 0 && <PortalEmptyState title="No goals yet" description="Goals assigned by HR will appear here." />}
      </div>
    </PortalCard>
  </div>;
}

function InfoTile({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-1 font-black text-slate-950">{value}</div>
  </div>;
}

