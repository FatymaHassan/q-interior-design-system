import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import ClientList from "./ClientList";
import { deleteClient, getClients } from "./clientApi";

export default function Clients() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => getClients().then(setClients).catch(() => setClients([]));
  const removeClient = async (client) => {
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    await deleteClient(client.id);
    loadClients();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/clients/add"><Button>Add Client</Button></Link></div>
    <ClientList clients={clients} onDelete={removeClient} />
  </div>;
}
