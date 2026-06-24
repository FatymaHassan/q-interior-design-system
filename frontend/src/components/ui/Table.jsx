export default function Table({ columns, rows, empty = "No records found." }) {
  return <div className="overflow-x-auto rounded-xl border border-brand-border/70 bg-white">
    <table className="w-full text-sm">
      <thead className="bg-brand-soft/80">
        <tr className="border-b border-brand-border text-left text-brand-muted">
          {columns.map((column) => <th key={column.key} className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wide">{column.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-brand-muted">{empty}</td></tr>}
        {rows.map((row, index) => <tr key={row.id || index} className="border-b border-brand-border transition last:border-0 hover:bg-blue-50/40">
          {columns.map((column) => <td key={column.key} className="px-3.5 py-3 align-middle">
            {column.render ? column.render(row) : row[column.key]}
          </td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
