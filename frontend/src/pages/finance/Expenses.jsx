import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import ExpenseList from "./ExpenseList";
import { approveExpense, deleteExpense, getExpenses, rejectExpense } from "./expenseApi";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const confirm = useConfirmDialog();
  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => getExpenses({ expense_type: "project" }).then(setExpenses).catch(() => setExpenses([]));
  const removeExpense = async (expense) => {
    const ok = await confirm({
      title: "Delete expense?",
      message: `Delete "${expense.title}" from project expenses? This cannot be undone.`,
    });
    if (!ok) return;
    await deleteExpense(expense.id);
    loadExpenses();
  };
  const approve = async (expense) => {
    await approveExpense(expense.id);
    loadExpenses();
  };
  const reject = async (expense) => {
    await rejectExpense(expense.id);
    loadExpenses();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/expenses/add"><Button className="gap-2"><Plus size={16} />Add Expense</Button></Link></div>
    <ExpenseList expenses={expenses} onDelete={removeExpense} onApprove={approve} onReject={reject} />
  </div>;
}
