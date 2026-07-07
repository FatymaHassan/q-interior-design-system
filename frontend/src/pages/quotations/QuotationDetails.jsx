import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { approveQuotation, convertQuotation, getQuotation, getQuotationPdfUrl, getQuotationPreviewUrl, rejectQuotation, reviseQuotation, sendQuotation, uploadQuotationAttachment } from "./quotationApi";

export default function QuotationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [notice, setNotice] = useState("");
  const [attachment, setAttachment] = useState({ title: "", visibility: "client", file: null });

  const load = () => getQuotation(id).then(setQuotation).catch(() => setNotice("Could not load quotation."));
  useEffect(() => {
    load();
  }, [id]);

  const run = async (action) => {
    setNotice("");
    try {
      if (action === "send") await sendQuotation(id);
      if (action === "revise") await reviseQuotation(id, { change_notes: "Manual revision" });
      if (action === "approve") await approveQuotation(id, { client_comment: "Recorded by admin" });
      if (action === "reject") await rejectQuotation(id, { client_comment: "Recorded by admin" });
      if (action === "convert") await convertQuotation(id);
      await load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Action failed.");
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!attachment.file) return;
    const form = new FormData();
    form.append("title", attachment.title || attachment.file.name);
    form.append("visibility", attachment.visibility);
    form.append("file", attachment.file);
    await uploadQuotationAttachment(id, form);
    setAttachment({ title: "", visibility: "client", file: null });
    load();
  };

  if (!quotation) return <div className="rounded-2xl bg-white p-6 text-sm text-brand-muted">Loading quotation...</div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <Link to="/quotations" className="text-sm font-semibold text-brand-primary underline">Back to Quotations</Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-primary">{quotation.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2"><Badge>{quotation.status}</Badge><Badge>{quotation.quotationNumber}</Badge></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/quotations/${quotation.id}/edit`}><Button variant="outline">Edit</Button></Link>
        {quotation.status !== "Approved" && <Button variant="outline" onClick={() => run("send")}>Send</Button>}
        {quotation.status !== "Approved" && <Button variant="outline" onClick={() => run("revise")}>Revise</Button>}
        {quotation.status !== "Approved" && <Button variant="outline" onClick={() => run("approve")}>Approve</Button>}
        {quotation.status !== "Rejected" && quotation.status !== "Approved" && <Button variant="outline" onClick={() => run("reject")}>Reject</Button>}
        {quotation.status === "Approved" && <Button onClick={() => run("convert")}>Convert</Button>}
        <a href={getQuotationPreviewUrl(quotation.id)} target="_blank" rel="noreferrer"><Button variant="outline">Preview</Button></a>
        <a href={getQuotationPdfUrl(quotation.id)} download><Button variant="outline">Download PDF</Button></a>
      </div>
    </div>
    {notice && <p className="rounded-xl bg-brand-soft p-3 text-sm text-brand-primary">{notice}</p>}

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-xl font-bold">Scope of Work</h2>
        <div className="space-y-4">
          {quotation.sections?.length ? quotation.sections.map((section) => <div key={section.id || section.title} className="rounded-2xl border border-brand-border overflow-hidden">
            <div className="bg-brand-primary px-4 py-3 font-bold uppercase text-white">{section.title}</div>
            {(section.rooms || []).map((room) => <div key={room.id || room.title}>
              <div className="bg-brand-soft px-4 py-2 font-semibold">{room.title}</div>
              <Table columns={[
                { key: "description", label: "Description" },
                { key: "quantity", label: "Qty / Unit", render: (item) => formatQtyUnit(item) },
                { key: "rate", label: "Rate", render: (item) => `$${Number(item.rate || item.unit_price || 0).toLocaleString()}` },
                { key: "discount", label: "Discount", render: (item) => `$${Number(item.discount || 0).toLocaleString()}` },
                { key: "tax", label: "VAT/Tax", render: (item) => `$${Number(item.tax || 0).toLocaleString()}` },
                { key: "total", label: "Total", render: (item) => <b>${Number(item.total || 0).toLocaleString()}</b> },
                { key: "notes", label: "Notes" },
              ]} rows={room.items || []} />
            </div>)}
          </div>) : <Table
            columns={[
              { key: "description", label: "Description" },
              { key: "quantity", label: "Qty / Unit", render: (item) => formatQtyUnit(item) },
              { key: "unit_price", label: "Rate", render: (item) => `$${Number(item.unit_price || 0).toLocaleString()}` },
              { key: "discount", label: "Discount", render: (item) => `$${Number(item.discount || 0).toLocaleString()}` },
              { key: "tax", label: "VAT/Tax", render: (item) => `$${Number(item.tax || 0).toLocaleString()}` },
              { key: "total", label: "Total", render: (item) => <b>${Number(item.total || 0).toLocaleString()}</b> },
            ]}
            rows={quotation.items}
          />}
        </div>
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-xl font-bold">Summary</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Client</span><b>{quotation.client}</b></div>
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Project</span><b>{quotation.project}</b></div>
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Valid until</span><b>{quotation.validUntil || "-"}</b></div>
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Discount / VAT</span><b>${quotation.totalDiscount.toLocaleString()} / ${quotation.totalTax.toLocaleString()}</b></div>
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Profit</span><b>{quotation.profitPercentage}% / ${quotation.profitAmount.toLocaleString()}</b></div>
          <div className="flex justify-between rounded-xl bg-brand-soft p-3"><span>Grand Total</span><b>${quotation.grandTotal.toLocaleString()}</b></div>
          {quotation.invoice && <div className="rounded-xl bg-green-50 p-3 text-green-700"><b>Invoice created:</b> {quotation.invoice.invoice_number}</div>}
        </div>
      </Card>
    </div>

    <Card className="p-5 md:p-6">
      <h2 className="mb-3 text-xl font-bold">Terms & Notes</h2>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        <div><b>Payment Terms</b><p className="mt-1 text-brand-muted">{quotation.paymentTerms || "-"}</p></div>
        <div><b>Special Conditions</b><p className="mt-1 text-brand-muted">{quotation.specialConditions || "-"}</p></div>
        <div><b>Scope Exclusions</b><p className="mt-1 text-brand-muted">{quotation.scopeExclusions || "-"}</p></div>
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-xl font-bold">Attachments</h2>
        <form onSubmit={upload} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <input value={attachment.title} onChange={(event) => setAttachment((current) => ({ ...current, title: event.target.value }))} placeholder="Attachment title" className={fieldInputClass} />
          <select value={attachment.visibility} onChange={(event) => setAttachment((current) => ({ ...current, visibility: event.target.value }))} className={fieldInputClass}><option value="client">Client</option><option value="internal">Internal</option></select>
          <input type="file" onChange={(event) => setAttachment((current) => ({ ...current, file: event.target.files?.[0] || null }))} className={fieldInputClass} />
          <div className="md:col-span-3"><Button>Upload Attachment</Button></div>
        </form>
        <Table columns={[{ key: "title", label: "Title" }, { key: "visibility", label: "Visibility" }, { key: "file_type", label: "Type" }]} rows={quotation.attachments} empty="No attachments uploaded." />
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="mb-4 text-xl font-bold">Version History</h2>
        <Table columns={[
          { key: "version_number", label: "Version" },
          { key: "status", label: "Status" },
          { key: "total_amount", label: "Total", render: (version) => `$${Number(version.total_amount || 0).toLocaleString()}` },
          { key: "change_notes", label: "Notes" },
        ]} rows={quotation.versions} empty="No version history yet." />
      </Card>
    </div>
  </div>;
}

function formatQtyUnit(item) {
  const unit = item.unit_type || (item.area_m2 ? "M²" : "Unit");
  if (unit === "Lump Sum") return "Lump Sum";
  const quantity = Number(item.quantity || item.area_m2 || 0);
  const label = unit === "Piece" && quantity !== 1 ? "Pieces" : unit;
  return `${quantity.toLocaleString()} ${label}`;
}
