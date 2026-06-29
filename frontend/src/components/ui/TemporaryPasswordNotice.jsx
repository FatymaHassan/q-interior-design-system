import { ClipboardCopy, X } from "lucide-react";
import Button from "./Button";

export default function TemporaryPasswordNotice({ title = "Temporary password", email, password, onClose }) {
  if (!password) return null;

  const copyPassword = () => {
    navigator.clipboard?.writeText(password);
  };

  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-black">{title}</h3>
        <p className="mt-1 font-semibold">Copy this password now. It will not be shown again.</p>
      </div>
      {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1 text-amber-700 hover:bg-amber-100" aria-label="Dismiss">
        <X size={18} />
      </button>}
    </div>
    {email && <p className="mt-3"><span className="font-black">Login email:</span> {email}</p>}
    <div className="mt-2 flex flex-col gap-2 rounded-lg bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <code className="break-all text-base font-black text-brand-primary">{password}</code>
      <Button type="button" variant="outline" className="gap-2" onClick={copyPassword}><ClipboardCopy size={16} />Copy</Button>
    </div>
  </div>;
}
