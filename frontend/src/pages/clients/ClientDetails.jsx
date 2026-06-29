import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PasswordResetModal from "../../components/ui/PasswordResetModal";
import TemporaryPasswordNotice from "../../components/ui/TemporaryPasswordNotice";
import { getClient, resetClientPassword } from "./clientApi";

export default function ClientDetails() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState("loading");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(null);

  useEffect(() => {
    getClient(id)
      .then((record) => {
        setClient(record);
        setStatus("connected");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading") return <Card className="p-5 text-sm text-brand-muted">Loading client...</Card>;
  if (status === "error" || !client) return <Card className="p-5 text-sm text-brand-danger">Client could not be loaded.</Card>;

  const submitReset = async (payload) => {
    setResetting(true);
    try {
      const updated = await resetClientPassword(client.id, payload);
      setClient(updated);
      setTemporaryPassword({ email: client.email, password: payload.password });
      setResetOpen(false);
    } finally {
      setResetting(false);
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3">
      <Link to="/clients"><Button variant="outline">Back to Clients</Button></Link>
      <Link to={`/clients/${client.id}/edit`}><Button>Edit Client</Button></Link>
      <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>Reset Password</Button>
    </div>
    {temporaryPassword && <TemporaryPasswordNotice title="Client portal password reset" email={temporaryPassword.email} password={temporaryPassword.password} onClose={() => setTemporaryPassword(null)} />}

    <Card className="p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-muted">Client Profile</p>
          <h2 className="mt-1 text-2xl font-black text-brand-primary">{client.name}</h2>
          <p className="mt-2 text-sm text-brand-muted">{client.notes || "No notes yet."}</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-primary">{client.hasPortalAccess ? "Portal active" : "No portal password"}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <Info label="Email" value={client.email || "-"} />
        <Info label="Phone" value={client.phone || "-"} />
        <Info label="Location" value={client.location || "-"} />
        <Info label="Address" value={client.address || "-"} />
        <Info label="Portal Access" value={client.hasPortalAccess ? "Enabled" : "Disabled"} />
        <Info label="Login Email" value={client.email || "-"} />
        <Info label="Password Status" value={client.passwordStatus} />
        <Info label="Last Login" value={client.portalLastLogin} />
      </div>

      <div className="mt-5 rounded-xl border border-brand-border bg-brand-soft p-4 text-sm font-semibold text-brand-muted">
        Admin cannot view portal passwords. Use Reset Password to create a new temporary password.
      </div>
    </Card>
    {resetOpen && <PasswordResetModal title="Reset Client Password" email={client.email} onCancel={() => setResetOpen(false)} onSave={submitReset} saving={resetting} />}
  </div>;
}

function Info({ label, value }) {
  return <div className="rounded-xl bg-brand-soft p-3">
    <p className="text-xs font-black uppercase tracking-wide text-brand-muted">{label}</p>
    <p className="mt-1 font-bold text-brand-primary">{value}</p>
  </div>;
}
