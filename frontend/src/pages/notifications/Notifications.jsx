import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("loading");

  const load = () => getNotifications(type ? { type } : {}).then((data) => {
    setNotifications(data);
    setStatus("connected");
  }).catch(() => setStatus("error"));

  useEffect(() => {
    load();
  }, [type]);

  const types = useMemo(() => Array.from(new Set(notifications.map((item) => item.type).filter(Boolean))), [notifications]);
  const unread = notifications.filter((item) => !item.read).length;
  const high = notifications.filter((item) => item.priority === "high").length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Notification Center</h1>
        <p className="mt-1 text-sm text-brand-muted">Workflow alerts, reminders, approvals, backups, and system messages.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          {types.map((item) => <option key={item}>{item}</option>)}
        </select>
        <Button type="button" variant="outline" onClick={async () => { await markAllNotificationsRead(); load(); }}>Mark All Read</Button>
      </div>
    </div>

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Notifications could not be loaded.</Card>}

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-brand-muted">Unread</p><b className="text-2xl">{unread}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">High Priority</p><b className="text-2xl">{high}</b></Card>
      <Card className="p-4"><p className="text-sm text-brand-muted">Total</p><b className="text-2xl">{notifications.length}</b></Card>
    </div>

    <Card className="p-5">
      <Table columns={[
        { key: "title", label: "Notification", render: (item) => <div><b>{item.title}</b><p className="text-xs text-brand-muted">{item.message}</p></div> },
        { key: "type", label: "Type", render: (item) => <Badge>{item.type}</Badge> },
        { key: "priority", label: "Priority", render: (item) => <Badge>{item.priority}</Badge> },
        { key: "createdAt", label: "Created" },
        { key: "read", label: "Status", render: (item) => <Badge>{item.read ? "Read" : "Unread"}</Badge> },
        { key: "actions", label: "Actions", render: (item) => <div className="flex gap-2">{item.link && <Link to={item.link}><Button variant="outline" className="px-3 py-2">Open</Button></Link>} {!item.read && <Button className="px-3 py-2" onClick={() => markNotificationRead(item.id).then(load)}>Read</Button>}</div> },
      ]} rows={notifications} empty="No notifications yet." />
    </Card>
  </div>;
}
