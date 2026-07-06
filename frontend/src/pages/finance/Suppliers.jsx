import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { deleteSupplier, getSuppliers } from "../../services/api";
import { FinanceActionButton, FinanceHeader, FinanceMetric, FinanceNotice, FinanceSection, money } from "./financeUi";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const load = () => getSuppliers()
    .then((data) => {
      setSuppliers(data);
      setStatus("connected");
      setNotice("");
    })
    .catch(() => {
      setStatus("error");
      setNotice("Suppliers could not be loaded. Please check the backend.");
    });

  useEffect(() => {
    load();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((supplier) => [supplier.name, supplier.category, supplier.contactPerson, supplier.phone, supplier.email, supplier.city, supplier.status].join(" ").toLowerCase().includes(needle));
  }, [search, suppliers]);

  const totals = useMemo(() => ({
    count: suppliers.length,
    active: suppliers.filter((supplier) => supplier.status === "Active").length,
    balance: suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0),
    paid: suppliers.reduce((sum, supplier) => sum + Number(supplier.paid || 0), 0),
  }), [suppliers]);

  const removeSupplier = async (supplier) => {
    if (!window.confirm(`Delete supplier ${supplier.name}?`)) return;
    await deleteSupplier(supplier.id);
    setNotice("Supplier deleted successfully.");
    load();
  };

  return <div className="space-y-6">
    <FinanceHeader
      title="Suppliers"
      description="Track supplier balances, invoices, payments, and expense links from MySQL."
      action={<Link to="/suppliers/add"><Button className="gap-2"><Plus size={16} />Add Supplier</Button></Link>}
    />

    {notice && <FinanceNotice tone={status === "error" ? "error" : "info"}>{notice}</FinanceNotice>}

    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <FinanceMetric label="Suppliers" value={totals.count} />
      <FinanceMetric label="Active" value={totals.active} />
      <FinanceMetric label="Outstanding Balance" value={money(totals.balance)} />
      <FinanceMetric label="Supplier Payments" value={money(totals.paid)} />
    </section>

    <FinanceSection
      title="Supplier List"
      subtitle="Search and manage supplier balance records."
      action={<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search suppliers..." className={`${fieldInputClass} w-full min-w-[260px]`} />}
    >
        <Table columns={[
          { key: "name", label: "Supplier", render: (supplier) => <div><b>{supplier.name}</b><p className="text-xs text-brand-muted">{supplier.category || "General"}</p></div> },
          { key: "contactPerson", label: "Contact" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "balance", label: "Balance", render: (supplier) => money(supplier.balance) },
          { key: "status", label: "Status", render: (supplier) => <Badge>{supplier.status}</Badge> },
          { key: "actions", label: "Actions", render: (supplier) => <div className="flex flex-wrap gap-2">
            <Link to={`/suppliers/${supplier.id}/edit`}><FinanceActionButton tone="edit" label="Edit supplier"><Edit3 /></FinanceActionButton></Link>
            <FinanceActionButton tone="delete" label="Delete supplier" onClick={() => removeSupplier(supplier)}><Trash2 /></FinanceActionButton>
          </div> },
        ]} rows={filteredSuppliers} empty="No suppliers yet." />
    </FinanceSection>
  </div>;
}
