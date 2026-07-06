import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import ActionButton from "../../components/ui/ActionButton";
import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { FinanceMetric, FinanceSection, money } from "./financeUi";

export default function ExpenseList({ expenses, onDelete, onApprove, onReject }) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amountValue || 0), 0);
  const pending = expenses.filter((expense) => expense.approvalStatus === "Pending").length;
  const approvedTotal = expenses.filter((expense) => expense.approvalStatus === "Approved").reduce((sum, expense) => sum + Number(expense.amountValue || 0), 0);
  return <FinanceSection
    title="Project Expense Records"
    subtitle="Review costs recorded against projects, suppliers, categories, and approval status."
  >
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <FinanceMetric label="Total Recorded" value={money(total)} />
      <FinanceMetric label="Approved" value={money(approvedTotal)} />
      <FinanceMetric label="Pending Review" value={pending} />
    </div>
    <Table columns={[
      { key: "category", label: "Expense Category", render: (expense) => <span className="font-semibold text-slate-900">{expense.raw?.category || expense.category || "Project Expense"}</span> },
      { key: "title", label: "Item", render: (expense) => <span className="font-bold text-brand-primary">{expense.title}</span> },
      { key: "project", label: "Project", render: (expense) => <span className="text-slate-700">{expense.project || "-"}</span> },
      { key: "supplier", label: "Supplier", render: (expense) => <span className="text-slate-700">{expense.supplier || "-"}</span> },
      { key: "date", label: "Date" },
      { key: "approvalStatus", label: "Status", render: (expense) => <Badge>{expense.approvalStatus}</Badge> },
      { key: "amount", label: "Amount", render: (expense) => <span className="font-black text-slate-900">{expense.amount}</span> },
      { key: "actions", label: "Actions", render: (expense) => <div className="flex flex-wrap justify-end gap-2">
        <Link to={`/expenses/${expense.id}/edit`}><ActionButton tone="edit" title="Edit expense" aria-label="Edit expense"><Pencil /></ActionButton></Link>
        {expense.approvalStatus === "Pending" && <ActionButton tone="approve" title="Approve expense" aria-label="Approve expense" onClick={() => onApprove?.(expense)}><CheckCircle2 /></ActionButton>}
        {expense.approvalStatus === "Pending" && <ActionButton tone="warning" title="Reject expense" aria-label="Reject expense" onClick={() => onReject?.(expense)}><XCircle /></ActionButton>}
        <ActionButton tone="delete" title="Delete expense" aria-label="Delete expense" onClick={() => onDelete?.(expense)}><Trash2 /></ActionButton>
      </div> },
    ]} rows={expenses} empty="No project expenses found." />
  </FinanceSection>;
}
