import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import { isClientPayment, isSupplierPayment, paymentTypeLabel } from "../../services/api";
import Button from "../../components/ui/Button";
import { Link } from "react-router-dom";

export default function PaymentList({ payments, onDelete }) {
  const clientTotal = payments.filter((payment) => isClientPayment(payment.type)).reduce((sum, payment) => sum + payment.amount, 0);
  const supplierTotal = payments.filter((payment) => isSupplierPayment(payment.type)).reduce((sum, payment) => sum + payment.amount, 0);
  return <Card className="p-5 md:p-6">
    <div className="mb-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
      <div className="rounded-xl bg-green-50 p-4 text-green-700"><p>Client Payments</p><b className="text-xl">${clientTotal.toLocaleString()}</b></div>
      <div className="rounded-xl bg-brand-soft p-4"><p>Supplier Payments</p><b className="text-xl">${supplierTotal.toLocaleString()}</b></div>
      <div className="rounded-xl bg-brand-soft p-4"><p>Net Cash</p><b className="text-xl">${(clientTotal - supplierTotal).toLocaleString()}</b></div>
    </div>
    <Table columns={[
      { key: "type", label: "Type", render: (payment) => <b>{payment.typeLabel || paymentTypeLabel(payment.type)}</b> },
      { key: "project", label: "Project" },
      { key: "client", label: "Client" },
      { key: "supplier", label: "Supplier" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", render: (payment) => <Badge>{payment.status}</Badge> },
      { key: "amount", label: "Amount", render: (payment) => <b>${payment.amount.toLocaleString()}</b> },
      { key: "actions", label: "Actions", render: (payment) => <div className="flex flex-wrap gap-2">
        <Link to={`/payments/${payment.id}/edit`}><Button variant="outline" className="px-3 py-2">Edit</Button></Link>
        <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => onDelete?.(payment)}>Delete</Button>
      </div> },
    ]} rows={payments} />
  </Card>;
}
