import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { deleteQuotation, getQuotationPdfUrl, getQuotations, sendQuotation } from "./quotationApi";

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [notice, setNotice] = useState("");

  const load = () => {
    getQuotations()
      .then(setQuotations)
      .catch(() => setNotice("Backend is not reachable."));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (quotation) => {
    if (!window.confirm(`Delete ${quotation.quotationNumber}?`)) return;
    await deleteQuotation(quotation.id);
    load();
  };

  const send = async (quotation) => {
    await sendQuotation(quotation.id);
    load();
  };

  return <div className="space-y-6">
    <div className="flex justify-end"><Link to="/quotations/add"><Button>Create Quotation</Button></Link></div>
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}

    <Card className="p-5 md:p-6">
      <Table
        columns={[
          { key: "quotationNumber", label: "Quote #", render: (quotation) => <Link className="font-bold text-brand-primary underline" to={`/quotations/${quotation.id}`}>{quotation.quotationNumber}</Link> },
          { key: "title", label: "Title" },
          { key: "client", label: "Client" },
          { key: "status", label: "Status", render: (quotation) => <Badge>{quotation.status}</Badge> },
          { key: "validUntil", label: "Valid Until" },
          { key: "totalAmount", label: "Total", render: (quotation) => <b>${quotation.totalAmount.toLocaleString()}</b> },
          { key: "actions", label: "Actions", render: (quotation) => <div className="flex flex-wrap gap-2">
            <Link to={`/quotations/${quotation.id}/edit`}><Button variant="outline" className="px-3 py-2">Edit</Button></Link>
            {quotation.status === "Draft" || quotation.status === "Revised" ? <Button variant="outline" className="px-3 py-2" onClick={() => send(quotation)}>Send</Button> : null}
            <a href={getQuotationPdfUrl(quotation.id)} download><Button variant="outline" className="px-3 py-2">Download PDF</Button></a>
            <Button variant="outline" className="px-3 py-2 text-brand-danger" onClick={() => remove(quotation)}>Delete</Button>
          </div> },
        ]}
        rows={quotations}
        empty="No quotations yet."
      />
    </Card>
  </div>;
}
