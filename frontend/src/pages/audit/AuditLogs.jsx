import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { getAuditLogs } from "../../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ module: "", action: "", search: "" });
  const [status, setStatus] = useState("loading");

  const load = () => getAuditLogs(clean(filters)).then((data) => {
    setLogs(data);
    setStatus("connected");
  }).catch(() => setStatus("error"));

  useEffect(() => {
    load();
  }, []);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Audit Logs</h1>
        <p className="mt-1 text-sm text-brand-muted">Admin record of logins, backups, approvals, and critical actions.</p>
      </div>
      <Button type="button" onClick={load}>Apply Filters</Button>
    </div>

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Audit logs could not be loaded.</Card>}

    <Card className="p-5">
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input placeholder="Module" value={filters.module} onChange={(event) => setFilters({ ...filters, module: event.target.value })} className={fieldInputClass} />
        <input placeholder="Action" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} className={fieldInputClass} />
        <input placeholder="Search" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className={fieldInputClass} />
      </div>
      <Table columns={[
        { key: "action", label: "Action", render: (row) => <b>{row.action}</b> },
        { key: "module", label: "Module" },
        { key: "user", label: "User", render: (row) => row.user?.name || "-" },
        { key: "record_type", label: "Record Type" },
        { key: "record_id", label: "Record ID" },
        { key: "ip_address", label: "IP" },
        { key: "created_at", label: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" },
      ]} rows={logs} empty="No audit records yet." />
    </Card>
  </div>;
}

function clean(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}
