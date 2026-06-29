import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import Button from "./Button";
import FormField, { fieldInputClass } from "./FormField";

export default function PasswordResetModal({ title, email, onCancel, onSave, saving = false }) {
  const [form, setForm] = useState({ password: "", password_confirmation: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    await onSave(form);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-brand-primary">{title}</h2>
          {email && <p className="mt-1 text-sm font-semibold text-brand-muted">{email}</p>}
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-brand-muted hover:bg-brand-soft" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-brand-danger">{error}</p>}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <FormField label="New Password">
          <PasswordInput name="password" value={form.password} showPassword={showPassword} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} onToggle={() => setShowPassword((current) => !current)} />
        </FormField>
        <FormField label="Confirm New Password">
          <PasswordInput name="password_confirmation" value={form.password_confirmation} showPassword={showPassword} onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} onToggle={() => setShowPassword((current) => !current)} />
        </FormField>
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">After reset, copy the password immediately. It will not be shown again.</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={saving}>{saving ? "Saving..." : "Save Password"}</Button>
        </div>
      </form>
    </div>
  </div>;
}

function PasswordInput({ name, value, showPassword, onChange, onToggle }) {
  return <div className="relative">
    <input
      name={name}
      type={showPassword ? "text" : "password"}
      value={value}
      onChange={onChange}
      minLength={6}
      autoComplete="new-password"
      required
      className={`${fieldInputClass} pr-12`}
    />
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-soft hover:text-brand-primary"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  </div>;
}
