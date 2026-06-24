import { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getClientMessages, getProjects, markClientMessageRead, replyClientMessage } from "../../services/api";

export default function ClientMessagesInbox() {
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ project_id: "" });
  const [replyText, setReplyText] = useState({});

  const load = () => Promise.all([getClientMessages(filters), getProjects()])
    .then(([messageData, projectData]) => {
      setMessages(messageData);
      setProjects(projectData);
    })
    .catch(() => {});

  useEffect(() => {
    load();
  }, [filters.project_id]);

  const reply = async (message) => {
    const body = replyText[message.id];
    if (!body?.trim()) return;
    await replyClientMessage(message.project_id, body);
    setReplyText((current) => ({ ...current, [message.id]: "" }));
    load();
  };

  const read = async (message) => {
    await markClientMessageRead(message.id);
    load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-bold text-brand-primary">Client Messages</h1>
      <p className="text-sm text-brand-muted">Read client portal messages and reply from the staff side.</p>
    </div>

    <Card className="p-5">
      <FormField label="Filter by project">
        <select value={filters.project_id} onChange={(event) => setFilters({ project_id: event.target.value })} className={fieldInputClass}>
          <option value="">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </FormField>
    </Card>

    <div className="space-y-4">
      {messages.map((message) => <Card key={message.id} className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <b>{message.sender_type === "client" ? message.client?.name : message.user?.name || "Staff"}</b>
              <Badge>{message.is_read ? "Read" : "Unread"}</Badge>
              <span className="text-xs text-brand-muted">{message.project?.name || message.project?.project_name}</span>
            </div>
            <p className="mt-3 text-sm">{message.message}</p>
          </div>
          {!message.is_read && <Button variant="outline" className="px-3 py-2" onClick={() => read(message)}>Mark Read</Button>}
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input value={replyText[message.id] || ""} onChange={(event) => setReplyText((current) => ({ ...current, [message.id]: event.target.value }))} placeholder="Reply to client..." className={fieldInputClass} />
          <Button onClick={() => reply(message)}>Reply</Button>
        </div>
      </Card>)}
      {messages.length === 0 && <Card className="p-6 text-center text-sm text-brand-muted">No client messages yet.</Card>}
    </div>
  </div>;
}
