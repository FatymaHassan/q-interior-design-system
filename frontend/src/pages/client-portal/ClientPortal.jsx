import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircleIcon, ClockIcon, DownloadIcon, FileTextIcon, FolderOpenIcon, ImageIcon, LogOutIcon, MessageSquareIcon, PenLineIcon, RefreshCwIcon, SendIcon, SparklesIcon } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import ProgressBar from "../../components/ui/ProgressBar";
import { clientPortalLogout, decideClientApproval, decideClientQuotation, getClientPortalDashboard, getClientPortalDocumentUrl, getClientPortalQuotationPdfUrl, getClientPortalQuotations, getClientPortalTimeline, isClientPortalAuthenticated, logoutClientPortal, sendClientPortalMessage } from "../../services/api";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;
const date = (value) => value ? new Date(value).toLocaleDateString() : "-";

function PortalCard({ children, className = "" }) {
  return <Card className={`overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${className}`}>{children}</Card>;
}

function Metric({ icon: Icon, label, value, tone = "bg-slate-900 text-white" }) {
  return <PortalCard className="p-4">
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  </PortalCard>;
}

function SectionTitle({ icon: Icon, title, right }) {
  return <div className="mb-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-base font-black text-slate-950">{title}</h2>
    </div>
    {right}
  </div>;
}

export default function ClientPortal() {
  const [portal, setPortal] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [signedName, setSignedName] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [data, quotationData] = await Promise.all([getClientPortalDashboard(), getClientPortalQuotations()]);
      setPortal(data);
      setQuotations(quotationData);
      setSelectedProjectId((current) => current || String(data.projects?.[0]?.id || ""));
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

    getClientPortalTimeline(selectedProject.id)
      .then((data) => setTimeline(data.items || []))
      .catch(() => setTimeline([]));
  }, [selectedProject?.id]);

  if (!isClientPortalAuthenticated()) return <Navigate to="/login" replace />;

  const documents = (selectedProject?.documents || []).filter((document) => document.visibility === "client");
  const photos = documents.filter((document) => document.document_category === "photo" || document.file_type?.startsWith("image"));
  const files = documents.filter((document) => !photos.includes(document));
  const messages = selectedProject?.client_messages || selectedProject?.clientMessages || [];
  const approvals = selectedProject?.approvals || [];
  const projectQuotations = quotations.filter((quotation) => !selectedProject || quotation.projectId === selectedProject.id || quotation.project?.id === selectedProject.id);
  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending").length + projectQuotations.filter((quotation) => ["Sent", "Revised"].includes(quotation.status)).length;
  const progress = Number(selectedProject?.progress || 0);

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

  return <main className="min-h-screen bg-[#f3f0eb] text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-4 py-5 lg:px-6">
      <header className="rounded-[2rem] border border-white/70 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                <SparklesIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Q Interior Client Portal</p>
                <h1 className="mt-1 truncate text-2xl font-black md:text-3xl">{portal?.client?.name || "Client"}</h1>
              </div>
            </div>
            {selectedProject && <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{selectedProject.project_name || selectedProject.name} is currently in <span className="font-bold text-white">{selectedProject.stage?.name || "Inquiry"}</span> with {progress}% progress.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={load} disabled={loading}>
              <RefreshCwIcon className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={async () => { await clientPortalLogout(); window.location.assign("/login"); }}>
              <LogOutIcon className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {!selectedProject && <PortalCard className="p-6 text-sm font-semibold text-slate-500">No project is connected to this client yet.</PortalCard>}

      {selectedProject && <>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={FolderOpenIcon} label="Projects" value={projects.length} tone="bg-slate-950 text-white" />
          <Metric icon={ClockIcon} label="Progress" value={`${progress}%`} tone="bg-teal-700 text-white" />
          <Metric icon={FileTextIcon} label="Files" value={documents.length} tone="bg-indigo-700 text-white" />
          <Metric icon={PenLineIcon} label="Pending" value={pendingApprovals} tone="bg-amber-500 text-slate-950" />
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <PortalCard className="p-4">
            <SectionTitle icon={FolderOpenIcon} title="Projects" />
            <div className="space-y-2">
              {projects.map((project) => {
                const active = String(project.id) === String(selectedProject.id);
                return <button key={project.id} type="button" onClick={() => setSelectedProjectId(String(project.id))} className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{project.project_name || project.name}</p>
                      <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{project.stage?.name || "Inquiry"} - {date(project.deadline || project.end_date)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-black ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>{project.progress || 0}%</span>
                  </div>
                </button>;
              })}
            </div>
          </PortalCard>

          <PortalCard className="p-5 md:p-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.9fr]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{selectedProject.stage?.name || "Inquiry"}</Badge>
                  <Badge>{selectedProject.status || "Active"}</Badge>
                </div>
                <h2 className="mt-4 text-3xl font-black text-slate-950">{selectedProject.project_name || selectedProject.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{selectedProject.description || selectedProject.notes || "Project progress, approvals, files, and messages are connected here."}</p>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">Overall progress</span>
                    <span className="font-black text-slate-950">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Deadline</p>
                  <p className="mt-2 font-black text-slate-950">{date(selectedProject.deadline || selectedProject.end_date)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Location</p>
                  <p className="mt-2 font-black text-slate-950">{selectedProject.location || "-"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Budget</p>
                  <p className="mt-2 font-black text-slate-950">{money(selectedProject.budget)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Used</p>
                  <p className="mt-2 font-black text-slate-950">{money(selectedProject.actual_cost)}</p>
                </div>
              </div>
            </div>
          </PortalCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <PortalCard className="p-5">
            <SectionTitle icon={ImageIcon} title="Project Photos" right={<span className="text-xs font-black text-slate-500">{photos.length} items</span>} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map((photo) => <a key={photo.id} href={getClientPortalDocumentUrl(photo.id)} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={getClientPortalDocumentUrl(photo.id)} alt={photo.title} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" />
                <div className="p-3">
                  <p className="truncate text-sm font-black text-slate-950">{photo.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{photo.document_category}</p>
                </div>
              </a>)}
              {photos.length === 0 && <p className="text-sm font-semibold text-slate-500">No client-visible photos yet.</p>}
            </div>
          </PortalCard>

          <PortalCard className="p-5">
            <SectionTitle icon={FileTextIcon} title="Documents" right={<span className="text-xs font-black text-slate-500">{files.length} files</span>} />
            <div className="space-y-3">
              {files.map((document) => <a key={document.id} href={getClientPortalDocumentUrl(document.id)} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <FileTextIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">{document.title}</span>
                    <span className="text-xs font-semibold text-slate-500">{document.document_category || "document"}</span>
                  </span>
                </span>
                <DownloadIcon className="h-4 w-4 shrink-0 text-slate-500" />
              </a>)}
              {files.length === 0 && <p className="text-sm font-semibold text-slate-500">No client-visible documents yet.</p>}
            </div>
          </PortalCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <PortalCard className="p-5">
            <SectionTitle icon={ClockIcon} title="Timeline" />
            <div className="space-y-3">
              {timeline.slice(0, 8).map((item, index) => <div key={`${item.title}-${index}`} className="relative rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.type} - {item.status}</p>
                <p className="mt-2 text-xs text-slate-500">{item.date ? new Date(item.date).toLocaleString() : "-"}</p>
              </div>)}
              {timeline.length === 0 && <p className="text-sm font-semibold text-slate-500">No timeline updates yet.</p>}
            </div>
          </PortalCard>

          <PortalCard className="p-5">
            <SectionTitle icon={CheckCircleIcon} title="Approvals" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField label="Signature name"><input value={signedName} onChange={(event) => setSignedName(event.target.value)} placeholder={portal?.client?.name} className={fieldInputClass} /></FormField>
              <FormField label="Comment"><input value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} placeholder="Optional comment" className={fieldInputClass} /></FormField>
            </div>
            <div className="mt-4 space-y-3">
              {approvals.map((approval) => <div key={approval.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{approval.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{approval.description}</p>
                  </div>
                  <Badge>{approval.status}</Badge>
                </div>
                {approval.status === "Pending" && <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="px-3 py-2" onClick={() => decide(approval, "approve")}>Approve</Button>
                  <Button variant="outline" className="px-3 py-2" onClick={() => decide(approval, "revision")}>Revision</Button>
                  <Button variant="outline" className="px-3 py-2 text-red-600" onClick={() => decide(approval, "reject")}>Reject</Button>
                </div>}
              </div>)}
              {approvals.length === 0 && <p className="text-sm font-semibold text-slate-500">No approvals are pending.</p>}
            </div>
          </PortalCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <PortalCard className="p-5">
            <SectionTitle icon={FileTextIcon} title="Quotations" />
            <div className="space-y-3">
              {projectQuotations.map((quotation) => <div key={quotation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2"><Badge>{quotation.status}</Badge><Badge>{quotation.quotationNumber}</Badge></div>
                    <h3 className="mt-2 font-black text-slate-950">{quotation.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">Valid until {date(quotation.validUntil)} - {money(quotation.totalAmount)}</p>
                  </div>
                  <a href={getClientPortalQuotationPdfUrl(quotation.id)} download className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-900 hover:bg-slate-50">
                    <DownloadIcon className="mr-2 h-4 w-4" /> PDF
                  </a>
                </div>
                {["Sent", "Revised"].includes(quotation.status) && <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="px-3 py-2" onClick={() => decideQuotation(quotation, "approve")}>Approve & Sign</Button>
                  <Button variant="outline" className="px-3 py-2" onClick={() => decideQuotation(quotation, "revision")}>Revision</Button>
                  <Button variant="outline" className="px-3 py-2 text-red-600" onClick={() => decideQuotation(quotation, "reject")}>Reject</Button>
                </div>}
              </div>)}
              {projectQuotations.length === 0 && <p className="text-sm font-semibold text-slate-500">No quotations are available for this project.</p>}
            </div>
          </PortalCard>

          <PortalCard className="p-5">
            <SectionTitle icon={MessageSquareIcon} title="Messages" />
            <div className="mb-4 max-h-[360px] space-y-3 overflow-auto pr-1">
              {messages.map((item) => {
                const client = item.sender_type === "client";
                return <div key={item.id} className={`rounded-2xl p-4 text-sm ${client ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
                  <p className={`font-black ${client ? "text-white" : "text-slate-950"}`}>{client ? portal?.client?.name : item.user?.name || "Q Interior"}</p>
                  <p className={`mt-1 leading-5 ${client ? "text-slate-200" : "text-slate-600"}`}>{item.message}</p>
                </div>;
              })}
              {messages.length === 0 && <p className="text-sm font-semibold text-slate-500">No messages yet.</p>}
            </div>
            <form onSubmit={submitMessage} className="flex flex-col gap-3">
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Send a message to the project team..." rows="3" className={fieldInputClass} />
              <Button className="w-full">
                <SendIcon className="mr-2 h-4 w-4" /> Send Message
              </Button>
            </form>
          </PortalCard>
        </section>
      </>}
    </div>
  </main>;
}
