import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import PaymentList from "./PaymentList";
import { deletePayment, getPayments } from "./paymentApi";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  useEffect(() => {
    loadPayments();
  }, []);
  const loadPayments = () => getPayments().then(setPayments).catch(() => setPayments([]));
  const removePayment = async (payment) => {
    if (!window.confirm(`Delete payment ${payment.amount.toLocaleString()}?`)) return;
    await deletePayment(payment.id);
    loadPayments();
  };
  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/payments/add"><Button>Add Payment</Button></Link></div>
    <PaymentList payments={payments} onDelete={removePayment} />
  </div>;
}
