import { createContext, useContext, useMemo, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import Button from "./Button";

const ConfirmDialogContext = createContext(null);

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useMemo(() => (options = {}) => new Promise((resolve) => {
    setDialog({
      title: options.title || "Delete item?",
      message: options.message || "This action cannot be undone.",
      confirmLabel: options.confirmLabel || "Delete",
      cancelLabel: options.cancelLabel || "Cancel",
      tone: options.tone || "danger",
      resolve,
    });
  }), []);

  const close = (answer) => {
    dialog?.resolve(answer);
    setDialog(null);
  };

  return <ConfirmDialogContext.Provider value={confirm}>
    {children}
    {dialog && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center shadow-2xl">
        <button type="button" onClick={() => close(false)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close confirmation">
          <X size={17} />
        </button>
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${dialog.tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
          {dialog.tone === "danger" ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
        </div>
        <h2 className="mt-4 text-lg font-black text-brand-primary">{dialog.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-brand-muted">{dialog.message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => close(false)}>{dialog.cancelLabel}</Button>
          <Button type="button" variant={dialog.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)}>{dialog.confirmLabel}</Button>
        </div>
      </div>
    </div>}
  </ConfirmDialogContext.Provider>;
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used inside ConfirmDialogProvider");
  }
  return context;
}
