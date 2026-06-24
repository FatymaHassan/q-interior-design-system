import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { getClient, updateClient } from "./clientApi";

const emptyClient = { name: "", phone: "", email: "", portal_password: "", address: "", location: "", notes: "" };

export default function ClientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyClient);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getClient(id).then((client) => {
      setForm({
        name: client.name || "",
        phone: client.phone === "-" ? "" : client.phone || "",
        email: client.email === "-" ? "" : client.email || "",
        portal_password: "",
        address: client.address || "",
        location: client.location === "-" ? "" : client.location || "",
        notes: client.notes || "",
      });
      setStatus("connected");
    }).catch(() => {
      setError("Client could not be loaded.");
      setStatus("error");
    });
  }, [id]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitClient = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateClient(id, form);
      navigate("/clients");
    } catch {
      setError("Client could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div><Link to="/clients"><Button variant="outline">Back to Clients</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Edit Client</h2>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
      {status === "loading" && <p className="mt-4 text-sm text-brand-muted">Loading client...</p>}
      <form onSubmit={submitClient} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Client name"><input name="name" value={form.name} onChange={updateField} required className={fieldInputClass} /></FormField>
        <FormField label="Phone"><input name="phone" value={form.phone} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Email"><input name="email" type="email" value={form.email} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="New client portal password"><input name="portal_password" type="password" value={form.portal_password} onChange={updateField} placeholder="Leave blank to keep current" className={fieldInputClass} /></FormField>
        <FormField label="Location"><input name="location" value={form.location} onChange={updateField} className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FormField label="Address"><input name="address" value={form.address} onChange={updateField} className={fieldInputClass} /></FormField></div>
        <div className="lg:col-span-2"><FormField label="Notes"><textarea name="notes" value={form.notes} onChange={updateField} className={`${fieldInputClass} min-h-24 resize-y`} /></FormField></div>
        <div className="flex justify-end lg:col-span-2"><Button disabled={saving || status !== "connected"}>{saving ? "Updating Client..." : "Update Client"}</Button></div>
      </form>
    </Card>
  </div>;
}
