import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockIcon, MailIcon, SparklesIcon } from "lucide-react";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { clientPortalLogin, login, logoutClientPortal } from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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

  return <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8] px-4 py-8">
    <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden min-h-[560px] bg-slate-950 p-10 text-white lg:block">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(135deg, transparent 0 42%, rgba(245, 158, 11, .7) 42% 43%, transparent 43% 100%)" }} />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400 text-3xl font-black text-slate-950">Q</div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-amber-200">Interior Design Studio</p>
            <h1 className="mt-4 max-w-sm text-4xl font-black leading-tight">A clean workspace for projects, clients, finance, and teams.</h1>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Projects", "Finance", "Client Portal"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-black">{item}</p>
            </div>)}
          </div>
        </div>
      </div>

      <div className="flex min-h-[560px] items-center p-6 sm:p-8 lg:p-10">
        <div className="w-full">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-muted">Q Interior</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-brand-muted">Use one login for staff dashboard or client portal access.</p>
          </div>

          {error && <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-brand-danger">{error}</p>}

          <form onSubmit={submit} className="space-y-4">
            <FormField label="Email">
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className={`${fieldInputClass} pl-10`} name="email" type="email" value={form.email} onChange={updateField} placeholder="Enter your email" autoComplete="email" required />
              </div>
            </FormField>
            <FormField label="Password">
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className={`${fieldInputClass} pl-10`} name="password" type="password" value={form.password} onChange={updateField} placeholder="Enter your password" autoComplete="current-password" required />
              </div>
            </FormField>
            <Button className="min-h-12 w-full rounded-2xl" disabled={loading}>{loading ? "Checking account..." : "Sign In"}</Button>
          </form>
        </div>
      </div>
    </section>
  </main>;
}
