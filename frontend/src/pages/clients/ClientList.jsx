import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import ActionButton from "../../components/ui/ActionButton";
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
        <Link to={`/clients/${client.id}`}><ActionButton title="View client" aria-label="View client"><Eye /></ActionButton></Link>
        <Link to={`/clients/${client.id}/edit`}><ActionButton title="Edit client" aria-label="Edit client" tone="edit"><Edit3 /></ActionButton></Link>
        <ActionButton title="Delete client" aria-label="Delete client" tone="delete" onClick={() => onDelete?.(client)}><Trash2 /></ActionButton>
      </div> },
    ]} rows={clients} />
  </Card>;
}
