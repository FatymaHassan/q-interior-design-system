export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-2xl border border-brand-border bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="rounded-xl border border-brand-border px-3 py-2 text-sm text-brand-primary">Close</button>
      </div>
      {children}
    </div>
  </div>;
}
