import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, Clock, Download, FileText, FolderOpen, Home, Image, MessageSquare, PenLine, ReceiptText, RefreshCw, Send, UserRound } from "lucide-react";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import ProgressBar from "../../components/ui/ProgressBar";
import { PortalCard, PortalEmptyState, PortalSectionHeader, PortalShell, PortalSkeleton, PortalStatCard, PortalStatusBadge } from "../../components/portal/PortalShell";
import { clientPortalLogout, decideClientApproval, decideClientQuotation, getClientPortalDashboard, getClientPortalDocumentUrl, getClientPortalQuotationPdfUrl, getClientPortalQuotations, getClientPortalTimeline, isClientPortalAuthenticated, logoutClientPortal, sendClientPortalMessage } from "../../services/api";
import { formatDateOnly, formatDateTime } from "../../utils/dateTime";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;
const navItems = [
  { key: "Dashboard", label: "Home", icon: Home },
  { key: "My Project", label: "Project", icon: FolderOpen },
  { key: "Files", label: "Files", icon: Image },
  { key: "Approvals", label: "Approvals", icon: PenLine },
  { key: "Messages", label: "Messages", icon: MessageSquare },
  { key: "Profile", label: "Profile", icon: UserRound },
];

export default function ClientPortal() {
  const [active, setActive] = useState("Dashboard");
  const [portal, setPortal] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [signedName, setSignedName] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [data, quotationData] = await Promise.all([getClientPortalDashboard(), getClientPortalQuotations()]);
      setPortal(data);
      setQuotations(quotationData);
      setSelectedProjectId((current) => current || String(data.projects?.[0]?.id || ""));
      setNotice("");
    } catch {
      logoutClientPortal();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isClientPortalAuthenticated()) load();
  }, []);

  const projects = portal?.projects || [];
  const selectedProject = useMemo(() => projects.find((item) => String(item.id) === String(selectedProjectId)) || projects[0], [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setTimeline([]);
      return;
    }
    getClientPortalTimeline(selectedProject.id).then((data) => setTimeline(data.items || [])).catch(() => setTimeline([]));
  }, [selectedProject?.id]);

  if (!isClientPortalAuthenticated()) return <Navigate to="/login" replace />;

  const documents = (selectedProject?.documents || []).filter((document) => document.visibility === "client");
  const photos = documents.filter((document) => document.document_category === "photo" || document.file_type?.startsWith("image"));
  const files = documents.filter((document) => !photos.includes(document));
  const messages = selectedProject?.client_messages || selectedProject?.clientMessages || [];
  const approvals = selectedProject?.approvals || [];
  const projectQuotations = quotations.filter((quotation) => !selectedProject || quotation.projectId === selectedProject.id || quotation.project?.id === selectedProject.id);
  const invoices = projectQuotations.map((quotation) => quotation.invoice).filter(Boolean);
  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending").length + projectQuotations.filter((quotation) => ["Sent", "Revised"].includes(quotation.status)).length;

  const signOut = async () => {
    await clientPortalLogout();
    window.location.assign("/login");
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    if (!selectedProject || !message.trim()) return;
    await sendClientPortalMessage({ project_id: selectedProject.id, message });
    setMessage("");
    load();
  };

  const decide = async (approval, action) => {
    await decideClientApproval(approval.id, action, { signed_name: signedName || portal?.client?.name, client_comment: approvalComment });
    setApprovalComment("");
    load();
  };

  const decideQuotation = async (quotation, action) => {
    await decideClientQuotation(quotation.id, action, { signed_name: signedName || portal?.client?.name, client_comment: approvalComment });
    setApprovalComment("");
    load();
  };

  return <PortalShell
    title="Client Portal"
    subtitle="Private project hub"
    userName={portal?.client?.name}
    navItems={navItems}
    active={active}
    onNavigate={setActive}
    onLogout={signOut}
    notificationCount={pendingApprovals}
  >
    {notice && <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{notice}</p>}
    {loading && !portal ? <PortalSkeleton /> : !selectedProject ? <PortalEmptyState title="No project connected" description="Your project updates will appear here after Q Interior connects a project to your account." /> : <>
      {active === "Dashboard" && <Dashboard project={selectedProject} projects={projects} documents={documents} photos={photos} messages={messages} approvals={approvals} quotations={projectQuotations} invoices={invoices} onRefresh={load} loading={loading} />}
      {active === "My Project" && <ProjectHub projects={projects} project={selectedProject} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} timeline={timeline} />}
      {active === "Files" && <Files photos={photos} files={files} />}
      {active === "Approvals" && <Approvals approvals={approvals} quotations={projectQuotations} signedName={signedName} setSignedName={setSignedName} approvalComment={approvalComment} setApprovalComment={setApprovalComment} decide={decide} decideQuotation={decideQuotation} />}
      {active === "Messages" && <Messages messages={messages} client={portal?.client} message={message} setMessage={setMessage} submitMessage={submitMessage} />}
      {active === "Profile" && <Profile client={portal?.client} invoices={invoices} quotations={projectQuotations} />}
    </>}
  </PortalShell>;
}

function Dashboard({ project, projects, documents, photos, messages, approvals, quotations, invoices, onRefresh, loading }) {
  const progress = Number(project?.progress || 0);
  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending").length + quotations.filter((quotation) => ["Sent", "Revised"].includes(quotation.status)).length;
  const latestMessage = messages?.[0];
  const latestQuotation = quotations?.[0];
  const outstandingInvoice = invoices.find((invoice) => invoice.status !== "Paid");

  return <div className="space-y-5">
    <PortalCard className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-700">Private project hub</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">{project.project_name || project.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{project.location || "Location not set"} - {project.stage?.name || "Inquiry"} - {progress}% complete</p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading} className="gap-2"><RefreshCw size={16} />Refresh</Button>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-slate-600">Project progress</span><span className="font-black text-slate-950">{progress}%</span></div>
        <ProgressBar value={progress} />
      </div>
    </PortalCard>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PortalStatCard icon={FolderOpen} label="Projects" value={projects.length} tone="blue" />
      <PortalStatCard icon={FileText} label="Documents" value={documents.length} helper={`${photos.length} photos`} tone="slate" />
      <PortalStatCard icon={PenLine} label="Pending" value={pendingApprovals} helper="Approvals or quotations" tone="amber" />
      <PortalStatCard icon={MessageSquare} label="Messages" value={messages.length} helper={latestMessage ? "Latest available" : "No messages"} tone="green" />
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <PortalCard className="p-5 xl:col-span-2">
        <PortalSectionHeader title="Recent Photos" subtitle="Latest client-visible project images" />
        <PhotoGrid photos={photos.slice(0, 4)} />
      </PortalCard>
      <div className="space-y-4">
        <PortalCard className="p-5">
          <PortalSectionHeader title="Latest Quotation" />
          {latestQuotation ? <MiniDocument title={latestQuotation.quotationNumber} value={money(latestQuotation.totalAmount)} status={latestQuotation.status} href={getClientPortalQuotationPdfUrl(latestQuotation.id)} /> : <PortalEmptyState title="No quotations yet" />}
        </PortalCard>
        <PortalCard className="p-5">
          <PortalSectionHeader title="Outstanding Invoice" />
          {outstandingInvoice ? <MiniDocument title={outstandingInvoice.invoice_number || "Invoice"} value={money(outstandingInvoice.balance || outstandingInvoice.total_amount)} status={outstandingInvoice.status} /> : <PortalEmptyState title="No unpaid invoices" />}
        </PortalCard>
      </div>
    </section>
  </div>;
}

function ProjectHub({ projects, project, selectedProjectId, setSelectedProjectId, timeline }) {
  const progress = Number(project?.progress || 0);
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
    <PortalCard className="p-4">
      <PortalSectionHeader title="My Projects" subtitle="Select a project" />
      <div className="space-y-2">
        {projects.map((item) => <button key={item.id} type="button" onClick={() => setSelectedProjectId(String(item.id))} className={`w-full rounded-lg border p-3 text-left transition ${String(item.id) === String(selectedProjectId) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <p className="truncate text-sm font-black">{item.project_name || item.name}</p>
          <p className={`mt-1 text-xs ${String(item.id) === String(selectedProjectId) ? "text-slate-300" : "text-slate-500"}`}>{item.stage?.name || "Inquiry"} - {item.progress || 0}%</p>
        </button>)}
      </div>
    </PortalCard>
    <div className="space-y-5">
      <PortalCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><PortalStatusBadge>{project.status || "Active"}</PortalStatusBadge><PortalStatusBadge>{project.stage?.name || "Inquiry"}</PortalStatusBadge></div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{project.project_name || project.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{project.description || project.notes || "Project information, timeline, documents, approvals, and messages are available here."}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-950">{progress}% complete</p>
            <p className="mt-1 text-slate-500">Deadline {formatDateOnly(project.deadline || project.end_date) || "-"}</p>
          </div>
        </div>
        <div className="mt-5"><ProgressBar value={progress} /></div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoTile label="Location" value={project.location || "-"} />
          <InfoTile label="Start" value={formatDateOnly(project.start_date) || "-"} />
          <InfoTile label="Deadline" value={formatDateOnly(project.deadline || project.end_date) || "-"} />
          <InfoTile label="Budget" value={money(project.budget)} />
        </div>
      </PortalCard>
      <Timeline items={timeline} />
    </div>
  </div>;
}

function Timeline({ items }) {
  const defaults = ["Inquiry", "Design", "Materials Order", "Installation", "Completed"];
  const rows = items.length ? items : defaults.map((title, index) => ({ title, status: index === 0 ? "Current" : "Pending", type: "stage" }));
  return <PortalCard className="p-5">
    <PortalSectionHeader title="Project Timeline" subtitle="Design and delivery milestones" />
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      {rows.slice(0, 5).map((item, index) => <div key={`${item.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700">{index + 1}</div>
        <p className="font-black text-slate-950">{item.title}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{item.status || item.type}</p>
        {item.date && <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.date)}</p>}
      </div>)}
    </div>
  </PortalCard>;
}

function Files({ photos, files }) {
  const [filter, setFilter] = useState("All");
  const filteredFiles = filter === "All" ? files : files.filter((file) => String(file.document_category || "").toLowerCase().includes(filter.toLowerCase()));
  return <div className="space-y-5">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Photos" subtitle="Project gallery" />
      <PhotoGrid photos={photos} />
    </PortalCard>
    <PortalCard className="p-5">
      <PortalSectionHeader title="Documents" subtitle="Contracts, invoices, quotations, and design files" action={<select value={filter} onChange={(event) => setFilter(event.target.value)} className={`${fieldInputClass} w-44`}><option>All</option><option>Design</option><option>Contract</option><option>Invoice</option><option>Quotation</option><option>Other</option></select>} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filteredFiles.map((file) => <a key={file.id} href={getClientPortalDocumentUrl(file.id)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileText size={20} /></span><span className="min-w-0"><span className="block truncate font-black text-slate-950">{file.title}</span><span className="text-sm text-slate-500">{file.document_category || "Document"}</span></span></span>
          <Download size={17} className="shrink-0 text-slate-500" />
        </a>)}
      </div>
      {filteredFiles.length === 0 && <PortalEmptyState title="No documents available" description="Client-visible documents will appear here." />}
    </PortalCard>
  </div>;
}

function Approvals({ approvals, quotations, signedName, setSignedName, approvalComment, setApprovalComment, decide, decideQuotation }) {
  return <div className="space-y-5">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Signature & Comment" subtitle="Used when approving, rejecting, or requesting revision" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label="Signature name"><input value={signedName} onChange={(event) => setSignedName(event.target.value)} className={fieldInputClass} placeholder="Your full name" /></FormField>
        <FormField label="Comment"><input value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} className={fieldInputClass} placeholder="Optional comment" /></FormField>
      </div>
    </PortalCard>
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <PortalCard className="p-5">
        <PortalSectionHeader title="Project Approvals" subtitle="Approve designs, documents, or milestones" />
        <div className="space-y-3">{approvals.map((approval) => <ApprovalCard key={approval.id} item={approval} onApprove={() => decide(approval, "approve")} onRevision={() => decide(approval, "revision")} onReject={() => decide(approval, "reject")} />)}</div>
        {approvals.length === 0 && <PortalEmptyState title="No approvals yet" />}
      </PortalCard>
      <PortalCard className="p-5">
        <PortalSectionHeader title="Quotations" subtitle="Review and download quotation PDFs" />
        <div className="space-y-3">{quotations.map((quotation) => <QuotationCard key={quotation.id} quotation={quotation} onApprove={() => decideQuotation(quotation, "approve")} onRevision={() => decideQuotation(quotation, "revision")} onReject={() => decideQuotation(quotation, "reject")} />)}</div>
        {quotations.length === 0 && <PortalEmptyState title="No quotations yet" />}
      </PortalCard>
    </section>
  </div>;
}

function ApprovalCard({ item, onApprove, onRevision, onReject }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-start justify-between gap-2"><div><p className="font-black text-slate-950">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.description || item.approval_type}</p></div><PortalStatusBadge>{item.status}</PortalStatusBadge></div>
    {item.status === "Pending" && <ActionRow onApprove={onApprove} onRevision={onRevision} onReject={onReject} />}
  </div>;
}

function QuotationCard({ quotation, onApprove, onRevision, onReject }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap gap-2"><PortalStatusBadge>{quotation.status}</PortalStatusBadge><PortalStatusBadge>{quotation.quotationNumber}</PortalStatusBadge></div><p className="mt-2 font-black text-slate-950">{quotation.title || quotation.projectTitle}</p><p className="mt-1 text-sm text-slate-500">{money(quotation.totalAmount)} - valid {formatDateOnly(quotation.validUntil) || "-"}</p></div>
      <a href={getClientPortalQuotationPdfUrl(quotation.id)} download className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-900 hover:bg-slate-50"><Download className="mr-2 h-4 w-4" />PDF</a>
    </div>
    {["Sent", "Revised"].includes(quotation.status) && <ActionRow onApprove={onApprove} onRevision={onRevision} onReject={onReject} />}
  </div>;
}

function ActionRow({ onApprove, onRevision, onReject }) {
  return <div className="mt-4 flex flex-wrap gap-2">
    <Button className="px-3 py-2" onClick={onApprove}>Approve</Button>
    <Button variant="outline" className="px-3 py-2" onClick={onRevision}>Request Revision</Button>
    <Button variant="outline" className="px-3 py-2 text-red-600" onClick={onReject}>Reject</Button>
  </div>;
}

function Messages({ messages, client, message, setMessage, submitMessage }) {
  return <PortalCard className="p-5">
    <PortalSectionHeader title="Messages" subtitle="Simple project conversation with Q Interior" />
    <div className="mb-4 max-h-[520px] space-y-3 overflow-auto pr-1">
      {messages.map((item) => {
        const clientMessage = item.sender_type === "client";
        return <div key={item.id} className={`max-w-[86%] rounded-lg p-4 text-sm ${clientMessage ? "ml-auto bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
          <p className={`font-black ${clientMessage ? "text-white" : "text-slate-950"}`}>{clientMessage ? client?.name : item.user?.name || "Q Interior"}</p>
          <p className={`mt-1 leading-5 ${clientMessage ? "text-slate-200" : "text-slate-600"}`}>{item.message}</p>
          {item.created_at && <p className={`mt-2 text-xs ${clientMessage ? "text-slate-400" : "text-slate-500"}`}>{formatDateTime(item.created_at)}</p>}
        </div>;
      })}
      {messages.length === 0 && <PortalEmptyState title="No messages yet" description="Send your first project message below." />}
    </div>
    <form onSubmit={submitMessage} className="flex flex-col gap-3 sm:flex-row">
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." rows="3" className={`${fieldInputClass} min-h-20 sm:flex-1`} />
      <Button className="min-h-12 gap-2 self-stretch"><Send size={17} />Send</Button>
    </form>
  </PortalCard>;
}

function Profile({ client, invoices, quotations }) {
  return <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
    <PortalCard className="p-5">
      <PortalSectionHeader title="Profile" subtitle="Client portal account" />
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-xl font-black text-blue-700">{client?.name?.slice(0, 1) || "C"}</span>
        <div><p className="font-black text-slate-950">{client?.name}</p><p className="text-sm text-slate-500">{client?.email}</p></div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3"><InfoTile label="Phone" value={client?.phone || "-"} /><InfoTile label="Location" value={client?.location || "-"} /></div>
    </PortalCard>
    <PortalCard className="p-5">
      <PortalSectionHeader title="Invoices & Quotations" subtitle="Financial documents connected to your project" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {invoices.map((invoice) => <MiniDocument key={invoice.id} title={invoice.invoice_number || "Invoice"} value={money(invoice.total_amount)} status={invoice.status} />)}
        {quotations.map((quotation) => <MiniDocument key={`q-${quotation.id}`} title={quotation.quotationNumber} value={money(quotation.totalAmount)} status={quotation.status} href={getClientPortalQuotationPdfUrl(quotation.id)} />)}
      </div>
      {invoices.length === 0 && quotations.length === 0 && <PortalEmptyState title="No financial documents yet" />}
    </PortalCard>
  </div>;
}

function PhotoGrid({ photos }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {photos.map((photo) => <a key={photo.id} href={getClientPortalDocumentUrl(photo.id)} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <img src={getClientPortalDocumentUrl(photo.id)} alt={photo.title} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" />
      <div className="p-3"><p className="truncate text-sm font-black text-slate-950">{photo.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{photo.document_category || "Photo"}</p></div>
    </a>)}
    {photos.length === 0 && <PortalEmptyState title="No photos yet" description="Project photos will appear here." />}
  </div>;
}

function MiniDocument({ title, value, status, href }) {
  const content = <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
    <div className="min-w-0"><p className="truncate font-black text-slate-950">{title}</p><p className="mt-1 text-sm font-bold text-slate-500">{value}</p></div>
    <PortalStatusBadge>{status}</PortalStatusBadge>
  </div>;
  return href ? <a href={href} download>{content}</a> : content;
}

function InfoTile({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 font-black text-slate-950">{value}</p>
  </div>;
}

