import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Lock, MessageSquare } from "lucide-react";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { clientPortalLogin } from "../../services/api";

export default function ClientPortalLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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

  return <main className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-4">
    <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:grid-cols-[1fr_0.92fr]">
      <div className="hidden bg-slate-950 p-8 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-950"><FolderOpen size={22} /></div>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Client Portal</p>
          <h1 className="mt-3 max-w-md text-4xl font-black leading-tight">Project progress, approvals, files, and messages in one clean workspace.</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[["Documents", FileText], ["Messages", MessageSquare]].map(([label, Icon]) => <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
            <Icon size={20} />
            <p className="mt-3 text-sm font-black">{label}</p>
          </div>)}
        </div>
      </div>
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white"><Lock size={20} /></div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Q Interior</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Client Login</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Open your project updates, quotations, approvals, and messages.</p>
        {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormField label="Email"><input name="email" type="email" value={form.email} onChange={updateField} className={fieldInputClass} required /></FormField>
          <FormField label="Password"><input name="password" type="password" value={form.password} onChange={updateField} className={fieldInputClass} required /></FormField>
          <Button className="min-h-12 w-full">Open Portal</Button>
        </form>
      </div>
    </section>
  </main>;
}
