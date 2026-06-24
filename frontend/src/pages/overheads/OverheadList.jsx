import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";

export default function OverheadList({ overheads = [], onDelete }) {
  return <Table
    columns={[
      { key: "title", label: "Overhead" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", render: (row) => `$${Number(row.amount || 0).toLocaleString()}` },
      { key: "date", label: "Date" },
      { key: "method", label: "Method" },
      { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2">
        <Link to={`/overheads/${row.id}/edit`}><Button variant="outline" className="px-3 py-2">Edit</Button></Link>
        <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => onDelete?.(row)}>Delete</Button>
      </div> },
    ]}
    rows={overheads}
    empty="No overhead records yet."
  />;
}
