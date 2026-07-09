import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import ClientList from "./ClientList";
import { deleteClient, getClients } from "./clientApi";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const confirm = useConfirmDialog();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => getClients().then(setClients).catch(() => setClients([]));
  const removeClient = async (client) => {
    const ok = await confirm({
      title: "Delete client?",
      message: `Delete "${client.name}" and remove this client record from the system? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteClient(client.id);
    loadClients();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/clients/add"><Button>Add Client</Button></Link></div>
    <ClientList clients={clients} onDelete={removeClient} />
  </div>;
}
