import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { deleteQuotation, getQuotationPdfUrl, getQuotationReport, getQuotations, sendQuotation } from "./quotationApi";

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState("");

  const load = () => {
    Promise.all([getQuotations(), getQuotationReport()])
      .then(([quotationData, reportData]) => {
        setQuotations(quotationData);
        setReport(reportData);
      })
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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Phase 4</p>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Quotations</h1>
      </div>
      <Link to="/quotations/add"><Button>Create Quotation</Button></Link>
    </div>
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}

    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {[
        ["Total Quotes", report?.total || quotations.length],
        ["Sent", report?.sent || 0],
        ["Approved", report?.approved || 0],
        ["Pipeline Value", `$${Number(report?.pipeline_value || 0).toLocaleString()}`],
        ["Approved Value", `$${Number(report?.approved_value || 0).toLocaleString()}`],
        ["Conversion Rate", `${Number(report?.conversion_rate || 0).toLocaleString()}%`],
        ["Pending Response", report?.pending_response || 0],
        ["Avg Approval Hours", report?.average_approval_hours || 0],
      ].map(([label, value]) => <Card key={label} className="p-4">
        <p className="text-sm text-brand-muted">{label}</p>
        <b className="mt-1 block text-2xl text-brand-primary">{value}</b>
      </Card>)}
    </div>

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
