import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CheckCircle2, Clock, Download, Edit3, FileText, Home, Image, MapPin, Search, Trash2, Upload, X } from "lucide-react";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PortalCard, PortalEmptyState, PortalSectionHeader, PortalShell, PortalSkeleton, PortalStatCard, PortalStatusBadge } from "../../components/portal/PortalShell";
import { createEmployeePortalProjectDocument, deleteEmployeePortalProjectDocument, downloadEmployeePortalProjectDocument, employeeCheckIn, employeeCheckOut, employeePortalLogout, getDocumentStorageUrl, getEmployeePortalAttendance, getEmployeePortalDashboard, getEmployeePortalProjectDocumentPreviewBlobUrl, getEmployeePortalProjectDocuments, getEmployeePortalProjects, getEmployeePortalReviews, updateEmployeePortalProjectDocument } from "../../services/api";
import { todayInSomalia } from "../../utils/dateTime";

const navItems = [
  { key: "Dashboard", label: "Home", icon: Home },
  { key: "Check In", label: "Check In", icon: MapPin },
  { key: "Attendance", label: "Attendance", icon: CalendarDays },
  { key: "Photos", label: "Photos", icon: Image },
  { key: "Documents", label: "Documents", icon: FileText },
  { key: "Reviews", label: "Reviews", icon: FileText },
];

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function EmployeePortal() {
  const navigate = useNavigate();
  const [active, setActive] = useState("Dashboard");
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState({ reviews: [], goals: [] });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (options = {}) => {
    if (!options.silent) setLoading(true);
    return Promise.all([
      getEmployeePortalDashboard(),
      getEmployeePortalAttendance(),
      getEmployeePortalProjects(),
      getEmployeePortalProjectDocuments(),
      getEmployeePortalReviews(),
    ]).then(([dashboard, attendanceData, projectData, documentData, reviewData]) => {
      setData(dashboard);
      setAttendance(attendanceData);
      setProjects(projectData);
      setDocuments(documentData);
      setReviews(reviewData);
      setNotice("");
    }).catch((error) => setNotice(error.response?.data?.message || "Employee portal data could not be loaded."))
      .finally(() => {
        if (!options.silent) setLoading(false);
      });
  };

  useEffect(() => {
    load();
    const refreshId = setInterval(() => {
      load({ silent: true });
    }, 15000);

    return () => clearInterval(refreshId);
  }, []);

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
      {active === "Photos" && <DocumentsPanel key="photos" mode="photos" documents={documents} projects={projects} onDone={load} />}
      {active === "Documents" && <DocumentsPanel key="documents" mode="documents" documents={documents} projects={projects} onDone={load} />}
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

function DocumentsPanel({ mode, documents, projects, onDone }) {
  const isPhotos = mode === "photos";
  const confirm = useConfirmDialog();
  const [form, setForm] = useState({ title: "", project_id: "", document_category: isPhotos ? "Photo" : "Design File", file: null });
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [editingDocument, setEditingDocument] = useState(null);
  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));
  const visibleDocuments = documents.filter((document) => {
    const matchesProject = selectedProjectId ? String(document.projectId) === String(selectedProjectId) : true;
    const matchesMode = isPhotos ? document.isPhoto : !document.isPhoto;
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [document.title, document.project, document.category, document.fileType].join(" ").toLowerCase().includes(needle);
    return matchesProject && matchesMode && matchesQuery;
  });

  useEffect(() => {
    if (!form.project_id && projects[0]?.id) {
      setForm((current) => ({ ...current, project_id: String(projects[0].id) }));
    }
  }, [form.project_id, projects]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.project_id) {
      setUploadError("Please choose a project before uploading.");
      return;
    }
    if (!editingDocument && !form.file) {
      setUploadError("Please choose a file before uploading.");
      return;
    }
    setUploadError("");
    setSaving(true);
    const payload = new FormData();
    payload.append("title", form.title || form.file.name);
    payload.append("project_id", form.project_id);
    payload.append("document_category", isPhotos ? "Photo" : form.document_category);
    if (form.file) payload.append("file", form.file);
    try {
      if (editingDocument) {
        await updateEmployeePortalProjectDocument(editingDocument.id, payload);
      } else {
        await createEmployeePortalProjectDocument(payload);
      }
      resetForm();
      event.target.reset();
      onDone();
    } catch (error) {
      setUploadError(apiErrorMessage(error, `${isPhotos ? "Photo" : "Document"} could not be uploaded.`));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingDocument(null);
    setUploadError("");
    setForm({ title: "", project_id: selectedProjectId || projects[0]?.id || "", document_category: isPhotos ? "Photo" : "Design File", file: null });
  };

  const startEdit = (document) => {
    setEditingDocument(document);
    setUploadError("");
    setForm({
      title: document.title,
      project_id: document.projectId ? String(document.projectId) : "",
      document_category: isPhotos ? "Photo" : document.category || "Design File",
      file: null,
    });
  };

  const removeDocument = async (document) => {
    const ok = await confirm({
      title: `Delete ${isPhotos ? "photo" : "document"}?`,
      message: `Delete "${document.title}"? This file will be removed from the project.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await deleteEmployeePortalProjectDocument(document.id);
    if (editingDocument?.id === document.id) resetForm();
    onDone();
  };

  return <div className="space-y-5">
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
      <PortalCard className="p-5">
        <p className="text-sm text-slate-500">{isPhotos ? "Project photos" : "Project documents"}</p>
        <b className="mt-2 block text-3xl text-slate-950">{visibleDocuments.length}</b>
        <p className="mt-2 text-sm text-slate-500">{selectedProject ? selectedProject.name : "All projects"}</p>
      </PortalCard>

      <PortalCard className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">{isPhotos ? <Image size={22} /> : <FileText size={22} />}</span>
          <div>
            <h2 className="text-xl font-black text-slate-950">{isPhotos ? "Project Photos" : "Project Documents"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a project to see only related {isPhotos ? "site photos, progress photos, and design images." : "contracts, design files, receipts, invoices, and PDFs."}
            </p>
          </div>
        </div>
      </PortalCard>
    </section>

    <PortalCard className="p-5">
      <PortalSectionHeader
        title={`${editingDocument ? "Edit" : "Upload"} ${isPhotos ? "Photo" : "Document"}`}
        subtitle={editingDocument ? "Change the title, project, category, or replace the file." : "Choose the project this file belongs to before uploading."}
        action={editingDocument ? <Button type="button" variant="outline" onClick={resetForm} className="gap-2"><X size={16} />Cancel</Button> : null}
      />
      {uploadError && <p className="mb-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{uploadError}</p>}
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_170px_1fr_auto]">
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={isPhotos ? "Photo title" : "Document title"} className={inputClass} />
        <select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} className={inputClass} required>
          <option value="">Select project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        {!isPhotos ? <select value={form.document_category} onChange={(event) => setForm({ ...form, document_category: event.target.value })} className={inputClass}>
          <option>Design File</option>
          <option>Drawing</option>
          <option>Contract</option>
          <option>Invoice</option>
          <option>Receipt</option>
          <option>Other</option>
        </select> : <div className="flex items-center rounded-lg border border-slate-200 bg-blue-50 px-3 py-2.5 text-sm font-black text-blue-700">Photo</div>}
        <input type="file" accept={isPhotos ? "image/*" : undefined} onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} className={inputClass} />
        <Button disabled={saving || !form.project_id || (!editingDocument && !form.file)} className="gap-2"><Upload size={16} />{saving ? "Saving..." : editingDocument ? "Save" : "Upload"}</Button>
      </form>
    </PortalCard>

    <PortalCard className="p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PortalSectionHeader title={isPhotos ? "Photos" : "Documents"} subtitle={selectedProject ? selectedProject.name : "All projects"} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isPhotos ? "Search photos..." : "Search documents..."} className={`${inputClass} pl-9`} />
          </div>
          <select value={selectedProjectId} onChange={(event) => {
            setSelectedProjectId(event.target.value);
            setForm((current) => ({ ...current, project_id: event.target.value || current.project_id }));
          }} className={inputClass}>
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
      </div>

      {isPhotos ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleDocuments.map((photo) => <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="aspect-[4/3] bg-slate-100"><EmployeeProjectDocumentImage document={photo} /></div>
          <div className="p-3">
            <p className="truncate font-black text-slate-950">{photo.title}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{photo.project}</p>
            <div className="mt-3 flex items-center gap-2">
              <IconButton label="Edit photo" onClick={() => startEdit(photo)}><Edit3 size={15} /></IconButton>
              <IconButton label="Download photo" onClick={() => downloadEmployeePortalProjectDocument(photo)}><Download size={15} /></IconButton>
              <IconButton label="Delete photo" tone="danger" onClick={() => removeDocument(photo)}><Trash2 size={15} /></IconButton>
            </div>
          </div>
        </div>)}
      </div> : <div className="space-y-2">
        {visibleDocuments.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileText size={18} /></span><span className="min-w-0"><span className="block truncate font-black text-slate-950">{file.title}</span><span className="text-sm text-slate-500">{file.project} - {file.category}</span></span></span>
          <span className="flex shrink-0 items-center gap-2">
            <IconButton label="Edit document" onClick={() => startEdit(file)}><Edit3 size={15} /></IconButton>
            <IconButton label="Download document" onClick={() => downloadEmployeePortalProjectDocument(file)}><Download size={15} /></IconButton>
            <IconButton label="Delete document" tone="danger" onClick={() => removeDocument(file)}><Trash2 size={15} /></IconButton>
          </span>
        </div>)}
      </div>}
      {visibleDocuments.length === 0 && <PortalEmptyState title={isPhotos ? "No photos yet" : "No documents yet"} description={isPhotos ? "Project photos will appear here." : "Project documents will appear here."} />}
    </PortalCard>
  </div>;
}

function EmployeeProjectDocumentImage({ document }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    getEmployeePortalProjectDocumentPreviewBlobUrl(document.id)
      .then((url) => {
        objectUrl = url;
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(getDocumentStorageUrl(document.filePath));
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id]);

  return src ? <img src={src} alt={document.title} onError={() => setSrc("")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><Image size={30} /></div>;
}

function IconButton({ label, tone = "default", onClick, children }) {
  const toneClass = tone === "danger"
    ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${toneClass}`}
  >
    {children}
  </button>;
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

function apiErrorMessage(error, fallback) {
  const data = error.response?.data;
  const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : "";
  return firstFieldError || data?.message || fallback;
}

