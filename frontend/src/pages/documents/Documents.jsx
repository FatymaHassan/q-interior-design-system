import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, FileText, Image, Search, Trash2, Upload, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { createDocument, deleteDocument, downloadDocumentFile, getDocumentPreviewBlobUrl, getDocuments, getProjects, updateDocument } from "../../services/api";

const fieldInputClass = "w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm outline-none focus:border-brand-gold";

export default function Documents({ mode = "documents" }) {
  const isPhotos = mode === "photos";
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [form, setForm] = useState({
    project_id: "",
    title: "",
    document_category: isPhotos ? "Photo" : "Design File",
    visibility: "internal",
    file: null,
  });

  const selectedProject = projects.find((project) => String(project.id) === String(selectedProjectId));

  const loadDocuments = async (projectId = selectedProjectId) => {
    setStatus("loading");
    try {
      const data = await getDocuments({
        kind: isPhotos ? "photo" : "document",
        ...(projectId ? { project_id: projectId } : {}),
      });
      setDocuments(data);
      setStatus("connected");
    } catch {
      setStatus("error");
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
    if (!window.confirm(`Delete "${document.title}"?`)) return;
    await deleteDocument(document.id);
    if (editingDocument?.id === document.id) resetForm();
    await loadDocuments(selectedProjectId);
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

      {isPhotos ? <PhotoGrid photos={filteredDocuments} onEdit={startEdit} onDelete={removeDocument} /> : <DocumentTable documents={filteredDocuments} onEdit={startEdit} onDelete={removeDocument} />}
    </Card>
  </div>;
}

function PhotoGrid({ photos, onEdit, onDelete }) {
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
            <button type="button" onClick={() => downloadDocumentFile(photo)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary underline"><Download size={15} />Download</button>
            <button type="button" onClick={() => onDelete(photo)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-danger underline"><Trash2 size={15} />Delete</button>
          </div>
        </div>
      </div>
    </article>)}
  </div>;
}

function DocumentImage({ document }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    getDocumentPreviewBlobUrl(document.id)
      .then((url) => {
        objectUrl = url;
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc("");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id]);

  return src ? <img src={src} alt={document.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-brand-muted"><Image size={32} /></div>;
}

function DocumentTable({ documents, onEdit, onDelete }) {
  return <Table
    columns={[
      { key: "title", label: "Title", render: (document) => <span className="flex items-center gap-2 font-semibold"><FileText size={16} />{document.title}</span> },
      { key: "project", label: "Project" },
      { key: "category", label: "Category" },
      { key: "visibility", label: "Visibility", render: (document) => <Badge>{document.visibility}</Badge> },
      { key: "createdAt", label: "Uploaded" },
      { key: "filePath", label: "File", render: (document) => document.filePath ? <button type="button" onClick={() => downloadDocumentFile(document)} className="font-semibold text-brand-primary underline">Download</button> : "-" },
      { key: "actions", label: "Actions", render: (document) => <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onEdit(document)} className="inline-flex items-center gap-1 font-semibold text-brand-primary underline"><Edit3 size={15} />Edit</button>
        <button type="button" onClick={() => onDelete(document)} className="inline-flex items-center gap-1 font-semibold text-brand-danger underline"><Trash2 size={15} />Delete</button>
      </div> },
    ]}
    rows={documents}
    empty="No project documents uploaded yet."
  />;
}
