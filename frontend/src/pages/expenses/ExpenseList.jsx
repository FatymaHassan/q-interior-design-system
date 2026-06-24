import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { Link } from "react-router-dom";

export default function ExpenseList({ expenses, onDelete, onApprove, onReject }) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return <Card className="p-5 md:p-6">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 className="font-bold">Expense Records</h3>
        <p className="text-sm text-brand-muted">Total recorded: ${total.toLocaleString()}</p>
      </div>
    </div>
    <Table columns={[
      { key: "title", label: "Title", render: (expense) => <b>{expense.title}</b> },
      { key: "project", label: "Project" },
      { key: "supplier", label: "Supplier" },
      { key: "category", label: "Category" },
      { key: "date", label: "Date" },
      { key: "approvalStatus", label: "Status", render: (expense) => <Badge>{expense.approvalStatus}</Badge> },
      { key: "amount", label: "Amount", render: (expense) => <b>${expense.amount.toLocaleString()}</b> },
      { key: "actions", label: "Actions", render: (expense) => <div className="flex flex-wrap gap-2">
        <Link to={`/expenses/${expense.id}/edit`}><Button variant="outline" className="px-3 py-2">Edit</Button></Link>
        {expense.approvalStatus === "Pending" && <Button variant="outline" className="px-3 py-2" onClick={() => onApprove?.(expense)}>Approve</Button>}
        {expense.approvalStatus === "Pending" && <Button variant="outline" className="px-3 py-2" onClick={() => onReject?.(expense)}>Reject</Button>}
        <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => onDelete?.(expense)}>Delete</Button>
      </div> },
    ]} rows={expenses} />
  </Card>;
}
