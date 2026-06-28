import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CheckCircle2, Clock, FileText, Home, MapPin, Plane, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { PortalCard, PortalEmptyState, PortalSectionHeader, PortalShell, PortalSkeleton, PortalStatCard, PortalStatusBadge } from "../../components/portal/PortalShell";
import { createEmployeePortalLeaveRequest, employeeCheckIn, employeeCheckOut, employeePortalLogout, getEmployeePortalAttendance, getEmployeePortalDashboard, getEmployeePortalLeaveBalances, getEmployeePortalLeaveRequests, getEmployeePortalPayslips, getEmployeePortalReviews } from "../../services/api";
import { todayInSomalia } from "../../utils/dateTime";

const navItems = [
  { key: "Dashboard", label: "Home", icon: Home },
  { key: "Check In", label: "Check In", icon: MapPin },
  { key: "Attendance", label: "Attendance", icon: CalendarDays },
  { key: "Leave", label: "Leave", icon: Plane },
  { key: "Payslips", label: "Payslips", icon: Wallet },
  { key: "Reviews", label: "Reviews", icon: FileText },
];

export default function EmployeePortal() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [reviews, setReviews] = useState({ reviews: [], goals: [] });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return Promise.all([
      getEmployeePortalDashboard(),
      getEmployeePortalAttendance(),
      getEmployeePortalLeaveRequests(),
      getEmployeePortalLeaveBalances(),
      getEmployeePortalPayslips(),
      getEmployeePortalReviews(),
    ]).then(([dashboard, attendanceData, requestData, balanceData, payslipData, reviewData]) => {
      setData(dashboard);
      setAttendance(attendanceData);
      setLeaveRequests(requestData);
      setLeaveBalances(balanceData);
      setPayslips(payslipData);
      setReviews(reviewData);
      setNotice("");
    }).catch((error) => setNotice(error.response?.data?.message || "Employee portal data could not be loaded."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const signOut = async () => {
    await employeePortalLogout();
    navigate("/employee-login", { replace: true });
  };

  const pendingLeaves = leaveRequests.filter((item) => item.status === "Pending").length;

  return <PortalShell
    title="Employee Portal"
    subtitle="Self-service HR"
    userName={data?.employee?.name}
    navItems={navItems}
    active={active}
    onNavigate={setActive}
    onLogout={signOut}
    notificationCount={pendingLeaves}
  >
    {notice && <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{notice}</p>}
    {loading && !data ? <PortalSkeleton /> : <>
      {active === "Dashboard" && <Dashboard dashboard={data} leaveBalances={leaveBalances} payslips={payslips} requests={leaveRequests} />}
      {active === "Check In" && <CheckInPanel today={data?.today_attendance} employee={data?.employee} onDone={load} />}
      {active === "Attendance" && <AttendancePanel attendance={attendance} />}
      {active === "Leave" && <LeavePanel requests={leaveRequests} balances={leaveBalances} onDone={load} />}
      {active === "Payslips" && <PayslipPanel rows={payslips} />}
      {active === "Reviews" && <ReviewPanel data={reviews} />}
    </>}
  </PortalShell>;
}

function Dashboard({ dashboard, leaveBalances, payslips, requests }) {
  const summary = dashboard?.attendance_summary || {};
  const today = dashboard?.today_attendance;
  const latestPayslip = payslips?.[0];
  const balance = leaveBalances?.[0];
  const pending = requests.filter((item) => item.status === "Pending").length;

  return <div className="space-y-5">
    <PortalCard className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700">Welcome back</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{dashboard?.employee?.name || "Employee"}</h1>
          <p className="mt-1 text-sm text-slate-500">{dashboard?.employee?.position || "Staff"} {dashboard?.employee?.department?.name ? `- ${dashboard.employee.department.name}` : ""}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-slate-300">Today</p>
          <p className="mt-1 text-lg font-black">{todayInSomalia()}</p>
        </div>
      </div>
    </PortalCard>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PortalStatCard icon={CheckCircle2} label="Today" value={today?.status || "No entry"} helper={`${today?.check_in || "-"} to ${today?.check_out || "-"}`} tone="green" />
      <PortalStatCard icon={BarChart3} label="Attendance" value={`${summary.attendance_percentage || 0}%`} helper="This month" tone="blue" />
      <PortalStatCard icon={Clock} label="Late" value={`${summary.late_percentage || 0}%`} helper={`${summary.late_days || 0} late days`} tone="amber" />
      <PortalStatCard icon={Plane} label="Leave" value={balance?.remaining_days ?? "-"} helper={`${pending} pending request`} tone="slate" />
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <PortalCard className="p-5">
        <PortalSectionHeader title="Today Attendance" subtitle="GPS attendance status and working hours" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoTile label="Status" value={<PortalStatusBadge>{today?.status || "No entry"}</PortalStatusBadge>} />
          <InfoTile label="Check In" value={today?.check_in || "-"} />
          <InfoTile label="Check Out" value={today?.check_out || "-"} />
          <InfoTile label="Hours" value={today?.total_hours || "0.00"} />
        </div>
      </PortalCard>
      <PortalCard className="p-5">
        <PortalSectionHeader title="Latest Payslip" subtitle="Payment summary" />
        {latestPayslip ? <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
          <div>
            <p className="font-black text-slate-950">{latestPayslip.month}/{latestPayslip.year}</p>
            <p className="mt-1 text-sm text-slate-500">Net salary: ${Number(latestPayslip.net_salary || 0).toLocaleString()}</p>
          </div>
          <PortalStatusBadge>{latestPayslip.payment_status}</PortalStatusBadge>
        </div> : <PortalEmptyState title="No payslips yet" description="Payslips will appear here when payroll is published." />}
      </PortalCard>
    </section>
  </div>;
}

function CheckInPanel({ today, employee, onDone }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const submit = async (type) => {
    setBusy(type);
    setMessage("Checking your location...");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const payload = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const result = type === "check_in" ? await employeeCheckIn(payload) : await employeeCheckOut(payload);
        setMessage(result.message);
        onDone();
      } catch (error) {
        setMessage(error.response?.data?.message || "Something went wrong while saving attendance.");
      } finally {
        setBusy("");
      }
    }, () => {
      setMessage("Location permission is required.");
      setBusy("");
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  return <div className="space-y-5">
    <PortalCard className="p-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><MapPin size={22} /></span>
            <div>
              <h1 className="text-xl font-black text-slate-950">GPS Check In / Check Out</h1>
              <p className="text-sm text-slate-500">Allow location permission and stay inside the office radius.</p>
            </div>
          </div>
          {message && <p className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
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
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
      <PortalStatCard icon={Plane} label="Leave" value={summary.leave_days || 0} tone="blue" />
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
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{row.date}</p><PortalStatusBadge>{row.status}</PortalStatusBadge></div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><InfoTile label="In" value={row.check_in || "-"} /><InfoTile label="Out" value={row.check_out || "-"} /><InfoTile label="Hours" value={row.total_hours || "0.00"} /></div>
  </div>;
}

function LeavePanel({ requests, balances, onDone }) {
  const [form, setForm] = useState({ leave_type: "Annual Leave", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    await createEmployeePortalLeaveRequest(form);
    setForm({ leave_type: "Annual Leave", start_date: "", end_date: "", reason: "" });
    setSaving(false);
    onDone();
  };
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Request Leave" subtitle="Submit a leave request for HR approval" />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {balances.map((item) => <InfoTile key={item.id} label={item.leave_type} value={`${item.remaining_days} days`} />)}
      </div>
      <form onSubmit={submit} className="space-y-3">
        <FormField label="Leave type"><select value={form.leave_type} onChange={(event) => setForm({ ...form, leave_type: event.target.value })} className={fieldInputClass}><option>Annual Leave</option><option>Sick Leave</option><option>Unpaid Leave</option><option>Emergency Leave</option><option>Other</option></select></FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Start date"><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className={fieldInputClass} required /></FormField>
          <FormField label="End date"><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className={fieldInputClass} required /></FormField>
        </div>
        <FormField label="Reason"><textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Reason" className={fieldInputClass} rows="4" /></FormField>
        <Button className="w-full" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</Button>
      </form>
    </PortalCard>
    <PortalCard className="p-5">
      <PortalSectionHeader title="Leave Requests" subtitle="Your request history" />
      <div className="space-y-3">
        {requests.map((request) => <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-950">{request.leave_type}</p><p className="mt-1 text-sm text-slate-500">{request.start_date} to {request.end_date} - {request.total_days} days</p></div><PortalStatusBadge>{request.status}</PortalStatusBadge></div>
          {request.reason && <p className="mt-3 text-sm text-slate-600">{request.reason}</p>}
          {request.rejection_reason && <p className="mt-2 text-sm font-bold text-red-600">{request.rejection_reason}</p>}
        </div>)}
        {requests.length === 0 && <PortalEmptyState title="No leave requests yet" description="Submitted leave requests will appear here." />}
      </div>
    </PortalCard>
  </div>;
}

function PayslipPanel({ rows }) {
  return <PortalCard className="p-5">
    <PortalSectionHeader title="Payslips" subtitle="Payroll documents and payment status" />
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2"><p className="font-black text-slate-950">{row.month}/{row.year}</p><PortalStatusBadge>{row.payment_status}</PortalStatusBadge></div>
        <p className="mt-3 text-2xl font-black text-slate-950">${Number(row.net_salary || 0).toLocaleString()}</p>
        <p className="mt-1 text-sm text-slate-500">Approval: {row.approval_status}</p>
      </div>)}
      {rows.length === 0 && <PortalEmptyState title="No payslips yet" description="Payslips will appear after payroll is processed." />}
    </div>
  </PortalCard>;
}

function ReviewPanel({ data }) {
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Performance Reviews" subtitle="Scores and manager comments" />
      <div className="space-y-3">
        {(data?.reviews || []).map((review) => <div key={review.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-950">{review.review_period}</p><p className="mt-1 text-sm text-slate-500">Rating: {review.overall_rating || "-"}</p></div><PortalStatusBadge>{review.status}</PortalStatusBadge></div>
          <p className="mt-3 text-sm text-slate-600">{review.manager_comments || "No manager comments yet."}</p>
        </div>)}
        {(data?.reviews || []).length === 0 && <PortalEmptyState title="No reviews yet" description="Performance reviews will appear here." />}
      </div>
    </PortalCard>
    <PortalCard className="p-5">
      <PortalSectionHeader title="Goals" subtitle="Current goals and progress" />
      <div className="space-y-3">
        {(data?.goals || []).map((goal) => <div key={goal.id} className="rounded-2xl border border-slate-200 p-4">
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
  return <div className="rounded-2xl bg-slate-50 p-3">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-1 font-black text-slate-950">{value}</div>
  </div>;
}
