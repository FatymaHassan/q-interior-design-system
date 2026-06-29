import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import { Edit3, Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientList({ clients, onDelete }) {
  return <Card className="p-5 md:p-6">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="font-bold">Customer Records</h3>
        <p className="text-sm text-brand-muted">Portal-ready customer profiles with project history.</p>
      </div>
      <span className="text-sm text-brand-muted">{clients.length} clients</span>
    </div>
    <Table columns={[
      { key: "name", label: "Name", render: (client) => <b>{client.name}</b> },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "location", label: "Location" },
      { key: "projects", label: "Projects", render: (client) => client.projects.length },
      { key: "actions", label: "Actions", render: (client) => <div className="flex flex-wrap gap-2">
        <Link to={`/clients/${client.id}`}><ActionIcon label="View client"><Eye size={16} /></ActionIcon></Link>
        <Link to={`/clients/${client.id}/edit`}><ActionIcon label="Edit client"><Edit3 size={16} /></ActionIcon></Link>
        <ActionIcon label="Delete client" danger onClick={() => onDelete?.(client)}><Trash2 size={16} /></ActionIcon>
      </div> },
    ]} rows={clients} />
  </Card>;
}

function ActionIcon({ children, label, danger = false, ...props }) {
  return <Button
    type="button"
    variant="outline"
    className={`h-9 w-9 rounded-lg p-0 ${danger ? "text-brand-danger hover:border-red-200 hover:bg-red-50" : ""}`}
    title={label}
    aria-label={label}
    {...props}
  >
    {children}
  </Button>;
}
