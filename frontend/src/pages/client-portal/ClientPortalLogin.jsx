import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { clientPortalLogin } from "../../services/api";

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "amina@example.com", password: "password" });
  const [error, setError] = useState("");
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await clientPortalLogin(form);
      navigate("/client-portal");
    } catch {
      setError("Client login failed. Please check email and password.");
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
    <Card className="w-full max-w-md p-6">
      <h1 className="font-display text-3xl font-bold text-brand-primary">Client Portal</h1>
      <p className="mt-1 text-sm text-brand-muted">Private project updates, documents, approvals, and messages.</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
      <form onSubmit={submit} className="mt-5 space-y-4">
        <FormField label="Email"><input name="email" value={form.email} onChange={updateField} className={fieldInputClass} /></FormField>
        <FormField label="Password"><input name="password" type="password" value={form.password} onChange={updateField} className={fieldInputClass} /></FormField>
        <Button className="w-full">Open Portal</Button>
      </form>
    </Card>
  </main>;
}
