import Table from "../../components/ui/Table";
import { Edit3, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { FinanceActionButton, FinanceMetric, FinanceSection, money } from "./financeUi";

export default function OverheadList({ overheads = [], onDelete }) {
  const total = overheads.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const categories = new Set(overheads.map((row) => row.category).filter(Boolean)).size;
  const monthlyAverage = overheads.length ? total / Math.max(1, categories || 1) : 0;

  return <FinanceSection
    title="Overhead List"
    subtitle="Review office, transport, utilities, rent, and other company operating costs."
  >
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <FinanceMetric label="Total Overheads" value={money(total)} />
      <FinanceMetric label="Records" value={overheads.length} />
      <FinanceMetric label="Cost Groups" value={categories} hint={`Avg ${money(monthlyAverage)}`} />
    </div>
    <Table
      columns={[
        { key: "title", label: "Overhead", render: (row) => <div><b className="text-brand-primary">{row.title}</b><p className="text-xs text-brand-muted">{row.paidBy || row.paid_by || "-"}</p></div> },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount", render: (row) => <b className="text-brand-primary">{money(row.amount)}</b> },
        { key: "date", label: "Date" },
        { key: "method", label: "Method" },
        { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2">
          <Link to={`/overheads/${row.id}/edit`}><FinanceActionButton tone="edit" label="Edit overhead"><Edit3 /></FinanceActionButton></Link>
          <FinanceActionButton tone="delete" label="Delete overhead" onClick={() => onDelete?.(row)}><Trash2 /></FinanceActionButton>
        </div> },
      ]}
      rows={overheads}
      empty="No overhead records yet."
    />
  </FinanceSection>;
}
