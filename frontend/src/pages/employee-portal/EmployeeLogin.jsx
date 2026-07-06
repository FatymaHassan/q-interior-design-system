import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Clock, Lock, MapPin } from "lucide-react";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { employeePortalLogin } from "../../services/api";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await employeePortalLogin(form);
      navigate("/employee-portal", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Employee login failed.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-brand-bg p-4 text-brand-text">
    <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-brand-border bg-white shadow-card lg:grid-cols-[1fr_0.92fr]">
      <div className="hidden bg-brand-primaryDark p-8 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/12 bg-white/10 text-brand-gold"><BriefcaseBusiness size={22} /></div>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-brand-gold">Employee Portal</p>
          <h1 className="mt-3 max-w-md text-4xl font-black leading-tight">Fast HR self-service for attendance, leave, payslips, and reviews.</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["GPS attendance", MapPin], ["Working hours", Clock]].map(([label, Icon]) => <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
            <Icon size={20} />
            <p className="mt-3 text-sm font-black">{label}</p>
          </div>)}
        </div>
      </div>
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary text-white"><Lock size={20} /></div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold">Q Interior</p>
        <h2 className="mt-2 text-3xl font-black text-brand-primary">Employee Login</h2>
        <p className="mt-2 text-sm leading-6 text-brand-muted">Use your employee email and password from HR.</p>
        {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormField label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldInputClass} required /></FormField>
          <FormField label="Password"><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={fieldInputClass} required /></FormField>
          <Button className="min-h-12 w-full" disabled={loading}>{loading ? "Checking..." : "Sign In"}</Button>
        </form>
      </div>
    </section>
  </main>;
}
