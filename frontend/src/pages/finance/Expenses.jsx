import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import ExpenseList from "./ExpenseList";
import { approveExpense, deleteExpense, getExpenses, rejectExpense } from "./expenseApi";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => getExpenses({ expense_type: "project" }).then(setExpenses).catch(() => setExpenses([]));
  const removeExpense = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return;
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
