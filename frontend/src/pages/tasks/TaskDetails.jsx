import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { addTaskComment, deleteTaskAttachment, getDocumentStorageUrl, getTask, updateTaskStatus, uploadTaskAttachment } from "../../services/api";

export default function TaskDetails() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const load = () => getTask(id).then(setTask).catch(() => setTask(null));

  useEffect(() => {
    load();
  }, [id]);

  const raw = task?.raw || {};
  const comments = raw.comments || [];
  const attachments = raw.attachments || [];
  const histories = raw.status_histories || raw.statusHistories || [];

  const changeStatus = async (status) => {
    await updateTaskStatus(id, status, statusNote);
    setStatusNote("");
    load();
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await addTaskComment(id, comment);
    setComment("");
    load();
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadTaskAttachment(id, file);
    event.target.value = "";
    load();
  };

  const removeAttachment = async (attachment) => {
    if (!window.confirm("Delete this attachment?")) return;
    await deleteTaskAttachment(attachment.id);
    load();
  };

  if (!task) return <Card className="p-5 text-sm text-brand-muted">Loading task...</Card>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/daily-tasks"><Button variant="outline">Back to Tasks</Button></Link>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => changeStatus("In Progress")}>Start</Button>
        <Button onClick={() => changeStatus("Done")}>Mark Done</Button>
      </div>
    </div>

    <Card className="p-5 md:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-primary">{task.title}</h1>
          <p className="mt-2 text-sm text-brand-muted">{raw.description || "No description added."}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Badge>{task.priority}</Badge><Badge>{task.status}</Badge></div>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-brand-soft p-3"><span className="text-brand-muted">Project</span><b className="block">{task.project}</b></div>
          <div className="rounded-xl bg-brand-soft p-3"><span className="text-brand-muted">Assigned To</span><b className="block">{task.assignee}</b></div>
          <div className="rounded-xl bg-brand-soft p-3"><span className="text-brand-muted">Assigned By</span><b className="block">{raw.assigner?.name || "-"}</b></div>
          <div className="rounded-xl bg-brand-soft p-3"><span className="text-brand-muted">Deadline</span><b className="block">{task.deadline}</b></div>
        </div>
      </div>
      <FormField label="Status change note" className="mt-5"><input value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Optional note before changing status" className={fieldInputClass} /></FormField>
    </Card>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">Comments</h2>
        <form onSubmit={submitComment} className="mb-4 flex flex-col gap-3 md:flex-row">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add progress note or comment..." className={fieldInputClass} />
          <Button>Comment</Button>
        </form>
        <div className="space-y-3">
          {comments.map((item) => <div key={item.id} className="rounded-2xl bg-brand-soft p-4 text-sm">
            <b>{item.user?.name || "Team member"}</b>
            <p className="mt-1">{item.comment}</p>
            <p className="mt-2 text-xs text-brand-muted">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</p>
          </div>)}
          {comments.length === 0 && <p className="text-sm text-brand-muted">No comments yet.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">Attachments</h2>
        <input type="file" onChange={uploadFile} className={fieldInputClass} />
        <Table
          columns={[
            { key: "file_type", label: "Type" },
            { key: "uploaded_by", label: "Uploaded By", render: (item) => item.uploader?.name || "-" },
            { key: "file_path", label: "File", render: (item) => item.file_path ? <a href={getDocumentStorageUrl(item.file_path)} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline">Open</a> : "-" },
            { key: "actions", label: "Actions", render: (item) => <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => removeAttachment(item)}>Delete</Button> },
          ]}
          rows={attachments}
          empty="No attachments uploaded."
        />
      </Card>
    </section>

    <Card className="p-5">
      <h2 className="mb-4 text-xl font-bold">Status History</h2>
      <Table
        columns={[
          { key: "old_status", label: "Old" },
          { key: "new_status", label: "New", render: (item) => <Badge>{item.new_status}</Badge> },
          { key: "changer", label: "Changed By", render: (item) => item.changer?.name || "System" },
          { key: "note", label: "Note" },
          { key: "created_at", label: "Changed", render: (item) => item.created_at ? new Date(item.created_at).toLocaleString() : "-" },
        ]}
        rows={histories}
        empty="No status changes recorded yet."
      />
    </Card>
  </div>;
}
