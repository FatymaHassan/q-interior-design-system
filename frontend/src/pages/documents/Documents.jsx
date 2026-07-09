import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, FileText, Image, Search, Trash2, Upload, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import Table from "../../components/ui/Table";
import { createDocument, deleteDocument, downloadDocumentFile, getDocumentPreviewBlobUrl, getDocumentStorageUrl, getDocuments, getProjects, updateDocument } from "../../services/api";

const fieldInputClass = "w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";

export default function Documents({ mode = "documents" }) {
  const isPhotos = mode === "photos";
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [editingDocument, setEditingDocument] = useState(null);
  const confirm = useConfirmDialog();
  const [form, setForm] = useState({
    project_id: "",
    title: "",
    document_category: isPhotos ? "Photo" : "Design File",
    visibility: "internal",
    file: null,
  });

  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));

  const loadDocuments = async (projectId = selectedProjectId, options = {}) => {
    if (!options.silent) setStatus("loading");
    try {
      const data = await getDocuments({
        kind: isPhotos ? "photo" : "document",
        ...(projectId ? { project_id: projectId } : {}),
      });
      setDocuments(data);
      setStatus("connected");
    } catch {
      if (!options.silent) setStatus("error");
    }
  };

  useEffect(() => {
    let active = true;
    getProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data);
      })
      .catch(() => {
        if (!active) return;
        setProjects([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setEditingDocument(null);
    setForm((current) => ({ ...current, project_id: selectedProjectId, document_category: isPhotos ? "Photo" : "Design File", file: null }));
    loadDocuments(selectedProjectId);
  }, [isPhotos, selectedProjectId]);

  useEffect(() => {
    const refreshId = setInterval(() => {
      loadDocuments(selectedProjectId, { silent: true });
    }, 15000);

    return () => clearInterval(refreshId);
  }, [isPhotos, selectedProjectId]);

  const filteredDocuments = useMemo(() => {
    const needle = query.toLowerCase();
    return documents.filter((document) =>
      [document.title, document.project, document.fileType, document.category].join(" ").toLowerCase().includes(needle)
    );
  }, [documents, query]);

  const submitFile = async (event) => {
    event.preventDefault();
    if (!form.title || (!editingDocument && !form.file)) return;
    setSaving(true);
    try {
      const payload = new FormData();
      if (form.project_id) payload.append("project_id", form.project_id);
      payload.append("title", form.title);
      payload.append("document_category", isPhotos ? "Photo" : form.document_category);
      payload.append("visibility", form.visibility);
      if (form.file) payload.append("file", form.file);
      if (editingDocument) {
        await updateDocument(editingDocument.id, payload);
      } else {
        await createDocument(payload);
      }
      resetForm();
      event.target.reset();
      await loadDocuments(selectedProjectId);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingDocument(null);
    setForm({
      project_id: selectedProjectId,
      title: "",
      document_category: isPhotos ? "Photo" : "Design File",
      visibility: "internal",
      file: null,
    });
  };

  const startEdit = (document) => {
    setEditingDocument(document);
    setForm({
      project_id: document.projectId ? String(document.projectId) : "",
      title: document.title,
      document_category: isPhotos ? "Photo" : document.category,
      visibility: document.visibility,
      file: null,
    });
  };

  const removeDocument = async (document) => {
    const ok = await confirm({
      title: `Delete ${isPhotos ? "photo" : "document"}?`,
      message: `Delete "${document.title}"? This file will be removed from the system.`,
    });
    if (!ok) return;
    await deleteDocument(document.id);
    if (editingDocument?.id === document.id) resetForm();
    await loadDocuments(selectedProjectId);
  };

  const downloadFile = async (document) => {
    setDownloadError("");
    try {
      await downloadDocumentFile(document);
    } catch {
      setDownloadError(`Could not download "${document.title}". The file may be missing from storage.`);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Title", "Project", "Category", "File Type", "Path", "Uploaded"],
      ...filteredDocuments.map((document) => [
        document.title,
        document.project,
        document.category,
        document.fileType,
        document.filePath,
        document.createdAt,
      ]),
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    link.download = isPhotos ? "q-interior-project-photos.csv" : "q-interior-project-documents.csv";
    link.click();
  };

  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
      <Card className="p-5">
        <p className="text-sm text-brand-muted">{isPhotos ? "Project photos" : "Project documents"}</p>
        <b className="mt-2 block text-3xl">{filteredDocuments.length}</b>
        <p className="mt-2 text-sm text-brand-muted">{selectedProject ? selectedProject.name : "All projects"}</p>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              {isPhotos ? <Image size={22} /> : <FileText size={22} />}
              {isPhotos ? "Project Photos" : "Project Documents"}
            </h2>
            <p className="mt-1 text-sm text-brand-muted">
              Choose a project to see only the related {isPhotos ? "site photos, progress photos, and design images." : "contracts, design files, receipts, invoices, and PDFs."}
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </Card>
    </div>

    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-bold text-brand-primary">{editingDocument ? `Edit ${isPhotos ? "Photo" : "Document"}` : `Upload ${isPhotos ? "Photo" : "Document"}`}</h3>
          <p className="mt-1 text-sm text-brand-muted">{editingDocument ? "Change the title, category, project, visibility, or replace the file." : "Choose the project this file belongs to before uploading."}</p>
        </div>
        {editingDocument && <Button type="button" variant="outline" onClick={resetForm} className="gap-2"><X size={16} />Cancel Edit</Button>}
      </div>
      <form onSubmit={submitFile} className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_170px_1fr_auto]">
        <input
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder={isPhotos ? "Photo title" : "Document title"}
          className={fieldInputClass}
        />
        <select value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} className={fieldInputClass}>
          <option value="">All projects / no project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        {!isPhotos ? <select
          value={form.document_category}
          onChange={(event) => setForm((current) => ({ ...current, document_category: event.target.value }))}
          className={fieldInputClass}
        >
          <option>Design File</option>
          <option>Drawing</option>
          <option>Contract</option>
          <option>Receipt</option>
          <option>Invoice</option>
          <option>Other</option>
        </select> : <div className="flex items-center rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-primary">Photo</div>}
        <input
          type="file"
          accept={isPhotos ? "image/*" : undefined}
          onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
          className={fieldInputClass}
        />
        <Button disabled={saving || !form.title || (!editingDocument && !form.file)} className="gap-2"><Upload size={16} />{saving ? "Saving..." : editingDocument ? "Save" : "Upload"}</Button>
      </form>
    </Card>

    <Card className="p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isPhotos ? "Search photos..." : "Search documents..."}
            className="w-full rounded-xl border border-brand-border bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-gold"
          />
        </div>
        <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className={`${fieldInputClass} max-w-xs`}>
          <option value="">Show all projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      {status === "loading" && <span className="text-sm text-brand-muted">Loading {isPhotos ? "photos" : "documents"}...</span>}
      {status === "error" && <span className="text-sm text-brand-danger">Could not load {isPhotos ? "photos" : "documents"}.</span>}
      </div>
      {downloadError && <p className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-brand-danger">{downloadError}</p>}

      {isPhotos ? <PhotoGrid photos={filteredDocuments} onEdit={startEdit} onDelete={removeDocument} onDownload={downloadFile} /> : <DocumentTable documents={filteredDocuments} onEdit={startEdit} onDelete={removeDocument} onDownload={downloadFile} />}
    </Card>
  </div>;
}

function PhotoGrid({ photos, onEdit, onDelete, onDownload }) {
  if (photos.length === 0) {
    return <div className="rounded-xl border border-dashed border-brand-border bg-brand-soft p-10 text-center text-sm text-brand-muted">No project photos uploaded yet.</div>;
  }

  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {photos.map((photo) => <article key={photo.id} className="overflow-hidden rounded-xl border border-brand-border bg-white">
      <div className="aspect-[4/3] bg-brand-soft">
        {photo.filePath ? <DocumentImage document={photo} /> : <div className="flex h-full items-center justify-center text-brand-muted"><Image size={32} /></div>}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-bold text-brand-primary">{photo.title}</h3>
          <p className="mt-1 text-sm text-brand-muted">{photo.project}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Badge>{photo.visibility}</Badge>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onEdit(photo)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary underline"><Edit3 size={15} />Edit</button>
            <button type="button" onClick={() => onDownload(photo)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary underline"><Download size={15} />Download</button>
            <button type="button" onClick={() => onDelete(photo)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-danger underline"><Trash2 size={15} />Delete</button>
          </div>
        </div>
      </div>
    </article>)}
  </div>;
}

function DocumentImage({ document }) {
  const [src, setSrc] = useState("");
  const [fallbackSrc, setFallbackSrc] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    getDocumentPreviewBlobUrl(document.id)
      .then((url) => {
        objectUrl = url;
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) {
          const storageUrl = getDocumentStorageUrl(document.filePath);
          setFallbackSrc(storageUrl);
          setSrc(storageUrl);
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id]);

  return src ? <img src={src} alt={document.title} onError={() => setSrc(src !== fallbackSrc ? fallbackSrc : "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-brand-muted"><Image size={32} /></div>;
}

function DocumentTable({ documents, onEdit, onDelete, onDownload }) {
  return <Table
    columns={[
      { key: "preview", label: "Preview", render: (document) => document.isImage ? <span className="block h-12 w-12 overflow-hidden rounded-lg bg-brand-soft"><DocumentImage document={document} /></span> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-soft text-brand-primary"><FileText size={18} /></span> },
      { key: "title", label: "Title", render: (document) => <span className="flex items-center gap-2 font-semibold">{document.isImage ? <Image size={16} /> : <FileText size={16} />}{document.title}</span> },
      { key: "project", label: "Project" },
      { key: "category", label: "Category" },
      { key: "visibility", label: "Visibility", render: (document) => <Badge>{document.visibility}</Badge> },
      { key: "createdAt", label: "Uploaded" },
      { key: "filePath", label: "File", render: (document) => document.filePath ? <button type="button" onClick={() => onDownload(document)} className="font-semibold text-brand-primary underline">Download</button> : "-" },
      { key: "actions", label: "Actions", render: (document) => <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onEdit(document)} className="inline-flex items-center gap-1 font-semibold text-brand-primary underline"><Edit3 size={15} />Edit</button>
        <button type="button" onClick={() => onDelete(document)} className="inline-flex items-center gap-1 font-semibold text-brand-danger underline"><Trash2 size={15} />Delete</button>
      </div> },
    ]}
    rows={documents}
    empty="No project documents uploaded yet."
  />;
}
