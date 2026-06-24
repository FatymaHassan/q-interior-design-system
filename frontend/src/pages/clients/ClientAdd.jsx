import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { createClient } from "./clientApi";

const emptyClient = { name: "", phone: "", email: "", portal_password: "", address: "", location: "", notes: "" };

export default function ClientAdd() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitClient = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createClient(form);
      navigate("/clients");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div><Link to="/clients"><Button variant="outline">Back to Clients</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Add Client</h2>
      <form onSubmit={submitClient} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Client name"><input name="name" value={form.name} onChange={updateField} required placeholder="Amina Hassan" className={fieldInputClass} /></FormField>
        <FormField label="Phone"><input name="phone" value={form.phone} onChange={updateField} placeholder="+252..." className={fieldInputClass} /></FormField>
        <FormField label="Email"><input name="email" type="email" value={form.email} onChange={updateField} placeholder="client@example.com" className={fieldInputClass} /></FormField>
        <FormField label="Client portal password"><input name="portal_password" type="password" value={form.portal_password} onChange={updateField} placeholder="Minimum 6 characters" className={fieldInputClass} /></FormField>
        <FormField label="Location"><input name="location" value={form.location} onChange={updateField} placeholder="City or district" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FormField label="Address"><input name="address" value={form.address} onChange={updateField} placeholder="Street, building, area..." className={fieldInputClass} /></FormField></div>
        <div className="lg:col-span-2"><FormField label="Notes"><textarea name="notes" value={form.notes} onChange={updateField} placeholder="Design preferences, contact notes..." className={`${fieldInputClass} min-h-24 resize-y`} /></FormField></div>
        <div className="flex justify-end lg:col-span-2"><Button disabled={saving}>{saving ? "Saving Client..." : "Save Client"}</Button></div>
      </form>
    </Card>
  </div>;
}
