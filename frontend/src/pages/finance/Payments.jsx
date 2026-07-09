import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import PaymentList from "./PaymentList";
import { deletePayment, getPayments } from "./paymentApi";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const confirm = useConfirmDialog();
  useEffect(() => {
    loadPayments();
  }, []);
  const loadPayments = () => getPayments().then(setPayments).catch(() => setPayments([]));
  const removePayment = async (payment) => {
    const ok = await confirm({
      title: "Delete payment?",
      message: `Delete payment ${payment.amount.toLocaleString()}? This cannot be undone.`,
    });
    if (!ok) return;
    await deletePayment(payment.id);
    loadPayments();
  };
  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/payments/add"><Button className="gap-2"><Plus size={16} />Add Payment</Button></Link></div>
    <PaymentList payments={payments} onDelete={removePayment} />
  </div>;
}
