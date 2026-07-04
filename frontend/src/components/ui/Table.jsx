export default function Table({ columns, rows, empty = "No records found." }) {
  return <div className="overflow-x-auto rounded-lg border border-brand-border/80 bg-white shadow-sm">
    <table className="w-full min-w-[780px] text-sm">
      <thead className="bg-brand-soft/80">
        <tr className="border-b border-brand-border text-left text-slate-500">
          {columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3.5 text-[11px] font-black uppercase tracking-wide">{column.label}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border/70">
        {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-brand-muted">{empty}</td></tr>}
        {rows.map((row, index) => <tr key={row.id || index} className="transition hover:bg-brand-soft/45">
          {columns.map((column) => <td key={column.key} className="px-4 py-3.5 align-middle text-slate-700">
            {column.render ? column.render(row) : row[column.key]}
          </td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
