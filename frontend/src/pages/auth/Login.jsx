import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { clientPortalLogin, login, logoutClientPortal } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "test@example.com", password: "password" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form);
      logoutClientPortal();
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (staffError) {
      try {
        localStorage.removeItem("q_interior_token");
        localStorage.removeItem("q_interior_user");
        await clientPortalLogin(form);
        navigate("/client-portal", { replace: true });
      } catch {
        setError("Login failed. Check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
    <Card className="w-full max-w-md p-6">
      <div className="mb-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary text-xl font-black text-white">Q</div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-muted">Q Interior</p>
        <h1 className="mt-2 text-3xl font-black text-brand-primary">Sign in</h1>
        <p className="mt-2 text-sm text-brand-muted">Staff open the management dashboard. Clients open their private portal.</p>
      </div>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email"><input className={fieldInputClass} name="email" type="email" value={form.email} onChange={updateField} required /></FormField>
        <FormField label="Password"><input className={fieldInputClass} name="password" type="password" value={form.password} onChange={updateField} required /></FormField>
        <Button className="w-full" disabled={loading}>{loading ? "Checking account..." : "Sign In"}</Button>
      </form>
    </Card>
  </main>;
}
