import { useEffect, useState } from "react";
import ExpenseList from "./ExpenseList";
import { approveExpense, deleteExpense, getExpenses, rejectExpense } from "./expenseApi";
import { FinanceHeader } from "./financeUi";

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
    <FinanceHeader title="Expenses" description="Manage project expense records with the same finance UI pattern used for payroll and payments." />
    <ExpenseList expenses={expenses} onDelete={removeExpense} onApprove={approve} onReject={reject} />
  </div>;
}
