import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import TemporaryPasswordNotice from "../../components/ui/TemporaryPasswordNotice";
import { createClient } from "./clientApi";

const emptyClient = { name: "", phone: "", email: "", portal_password: "", portal_password_confirmation: "", address: "", location: "", notes: "" };

export default function ClientAdd() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdPassword, setCreatedPassword] = useState(null);
  const [error, setError] = useState("");

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submitClient = async (event) => {
    event.preventDefault();
    setError("");
    if (form.portal_password && form.portal_password !== form.portal_password_confirmation) {
      setError("Client portal passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await createClient(form);
      if (form.portal_password) {
        setCreatedPassword({ email: form.email, password: form.portal_password });
      } else {
        navigate("/clients");
      }
      setForm(emptyClient);
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div><Link to="/clients"><Button variant="outline">Back to Clients</Button></Link></div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">Add Client</h2>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-brand-danger">{error}</p>}
      {createdPassword && <div className="mt-4">
        <TemporaryPasswordNotice title="Client portal password created" email={createdPassword.email} password={createdPassword.password} onClose={() => navigate("/clients")} />
      </div>}
      <form onSubmit={submitClient} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormField label="Client name"><input name="name" value={form.name} onChange={updateField} required placeholder="Amina Hassan" className={fieldInputClass} /></FormField>
        <FormField label="Phone"><input name="phone" value={form.phone} onChange={updateField} placeholder="+252..." className={fieldInputClass} /></FormField>
        <FormField label="Email"><input name="email" type="email" value={form.email} onChange={updateField} placeholder="client@example.com" className={fieldInputClass} /></FormField>
        <FormField label="Client portal password">
          <div className="relative">
            <input name="portal_password" type={showPassword ? "text" : "password"} value={form.portal_password} onChange={updateField} placeholder="Minimum 6 characters" minLength={6} className={`${fieldInputClass} pr-12`} />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-soft hover:text-brand-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </FormField>
        <FormField label="Confirm client portal password"><input name="portal_password_confirmation" type={showPassword ? "text" : "password"} value={form.portal_password_confirmation} onChange={updateField} placeholder="Repeat password" minLength={6} className={fieldInputClass} /></FormField>
        <FormField label="Location"><input name="location" value={form.location} onChange={updateField} placeholder="City or district" className={fieldInputClass} /></FormField>
        <div className="lg:col-span-2"><FormField label="Address"><input name="address" value={form.address} onChange={updateField} placeholder="Street, building, area..." className={fieldInputClass} /></FormField></div>
        <div className="lg:col-span-2"><FormField label="Notes"><textarea name="notes" value={form.notes} onChange={updateField} placeholder="Design preferences, contact notes..." className={`${fieldInputClass} min-h-24 resize-y`} /></FormField></div>
        <div className="flex justify-end lg:col-span-2"><Button disabled={saving}>{saving ? "Saving Client..." : "Save Client"}</Button></div>
      </form>
    </Card>
  </div>;
}
