import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import { isClientPayment, isSupplierPayment, paymentTypeLabel } from "../../services/api";
import { Link } from "react-router-dom";
import { Edit3, Trash2 } from "lucide-react";
import { FinanceActionButton, FinanceMetric, FinanceSection, money } from "./financeUi";

export default function PaymentList({ payments, onDelete }) {
  const clientTotal = payments.filter((payment) => isClientPayment(payment.type)).reduce((sum, payment) => sum + payment.amount, 0);
  const supplierTotal = payments.filter((payment) => isSupplierPayment(payment.type)).reduce((sum, payment) => sum + payment.amount, 0);
  return <FinanceSection title="Payment List" subtitle="Client receipts and supplier payouts recorded against projects, invoices, and stages.">
    <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <FinanceMetric label="Client Payments" value={money(clientTotal)} />
      <FinanceMetric label="Supplier Payments" value={money(supplierTotal)} />
      <FinanceMetric label="Net Cash" value={money(clientTotal - supplierTotal)} />
    </div>
    <Table columns={[
      { key: "type", label: "Type", render: (payment) => <b className="text-brand-primary">{payment.typeLabel || paymentTypeLabel(payment.type)}</b> },
      { key: "project", label: "Project" },
      { key: "client", label: "Client" },
      { key: "supplier", label: "Supplier" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", render: (payment) => <Badge>{payment.status}</Badge> },
      { key: "amount", label: "Amount", render: (payment) => <b className="text-brand-primary">{money(payment.amount)}</b> },
      { key: "actions", label: "Actions", render: (payment) => <div className="flex flex-wrap gap-2">
        <Link to={`/payments/${payment.id}/edit`}><FinanceActionButton tone="edit" label="Edit payment"><Edit3 /></FinanceActionButton></Link>
        <FinanceActionButton tone="delete" label="Delete payment" onClick={() => onDelete?.(payment)}><Trash2 /></FinanceActionButton>
      </div> },
    ]} rows={payments} />
  </FinanceSection>;
}
