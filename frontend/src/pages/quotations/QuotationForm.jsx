import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import { createClient, getClients, getProjects, getQuotationPreviewUrl, getQuotationPdfUrl } from "../../services/api";
import { createQuotation, getQuotation, updateQuotation } from "./quotationApi";

const unitTypes = ["M²", "Meter", "Piece", "Unit", "Set", "Day", "Hour", "Lump Sum", "Custom"];
const defaultItem = { description: "", unit_type: "M²", quantity: 0, rate: 0, discount: 0, tax: 0, total: 0, is_manual_total: false, notes: "" };
const defaultRoom = { title: "Living Room", items: [{ ...defaultItem }] };
const defaultSection = { title: "GROUND FLOOR", rooms: [{ ...defaultRoom }] };
const emptyForm = {
  client_id: "",
  project_id: "",
  title: "",
  project_title: "",
  client_name: "",
  location: "",
  project_type: "Interior Design",
  quotation_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  profit_percentage: 8,
  payment_terms: "60% advance upon agreement\n30% upon progress payment\n10% final payment",
  payment_account_name: "",
  payment_bank: "",
  payment_account_no: "",
  payment_phone: "",
  payment_notes: "",
  terms_conditions: "Duration: Work completed within 4 weeks\nAll materials meet professional interior standards",
  footer_note: "Thank you for considering Q INTERIOR DESIGN STUDIO. We look forward to working with you!",
  notes: "",
  sections: [{ ...defaultSection }],
};

export default function QuotationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [savedId, setSavedId] = useState(id || null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", location: "" });

  useEffect(() => {
    Promise.all([getClients(), getProjects(), id ? getQuotation(id) : Promise.resolve(null)]).then(([clientData, projectData, quotation]) => {
      setClients(clientData);
      setProjects(projectData);
      if (quotation) {
        setForm({
          ...emptyForm,
          client_id: quotation.clientId,
          project_id: quotation.projectId || "",
          title: quotation.title,
          project_title: quotation.projectTitle || quotation.title,
          client_name: quotation.clientName,
          location: quotation.location,
          project_type: quotation.projectType,
          quotation_date: quotation.quotationDate,
          valid_until: quotation.validUntil || "",
          profit_percentage: quotation.profitPercentage || 0,
          payment_terms: quotation.paymentTerms,
          payment_account_name: quotation.paymentAccountName,
          payment_bank: quotation.paymentBank,
          payment_account_no: quotation.paymentAccountNo,
          payment_phone: quotation.paymentPhone,
          payment_notes: quotation.paymentNotes,
          terms_conditions: quotation.termsConditions,
          footer_note: quotation.footerNote,
          notes: quotation.notes,
          sections: quotation.sections?.length ? quotation.sections.map((section) => ({
            title: section.title,
            rooms: (section.rooms || []).map((room) => ({
              title: room.title,
              items: (room.items || []).map((item) => ({
                description: item.description,
                unit_type: item.unit_type || (item.area_m2 ? "M²" : "Unit"),
                quantity: item.quantity || item.area_m2 || 0,
                rate: item.rate || item.unit_price || 0,
                discount: item.discount || 0,
                tax: item.tax || 0,
                total: item.total || 0,
                is_manual_total: Boolean(item.is_manual_total),
                notes: item.notes || "",
              })),
            })),
          })) : [{ ...defaultSection }],
        });
      } else {
        setForm((current) => ({ ...current, client_id: clientData[0]?.id || "", project_id: "" }));
      }
    }).catch(() => setNotice("Could not load quotation form data."));
  }, [id]);

  const totals = useMemo(() => {
    const subtotal = form.sections.flatMap((section) => section.rooms).flatMap((room) => room.items).reduce((sum, item) => sum + itemTotal(item), 0);
    const profit = subtotal * Number(form.profit_percentage || 0) / 100;
    return { subtotal, profit, grand: subtotal + profit };
  }, [form.sections, form.profit_percentage]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateSection = (sectionIndex, title) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, title } : section) }));
  const addSection = () => setForm((current) => ({ ...current, sections: [...current.sections, { title: "NEW FLOOR / AREA", rooms: [{ title: "New Room", items: [{ ...defaultItem }] }] }] }));
  const addRoom = (sectionIndex) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, rooms: [...section.rooms, { title: "New Room", items: [{ ...defaultItem }] }] } : section) }));
  const updateRoom = (sectionIndex, roomIndex, title) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, rooms: section.rooms.map((room, rIndex) => rIndex === roomIndex ? { ...room, title } : room) } : section) }));
  const addItem = (sectionIndex, roomIndex) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, rooms: section.rooms.map((room, rIndex) => rIndex === roomIndex ? { ...room, items: [...room.items, { ...defaultItem }] } : room) } : section) }));
  const updateItem = (sectionIndex, roomIndex, itemIndex, field, value) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, rooms: section.rooms.map((room, rIndex) => rIndex === roomIndex ? { ...room, items: room.items.map((item, iIndex) => iIndex === itemIndex ? { ...item, [field]: value } : item) } : room) } : section) }));
  const changeUnitType = (sectionIndex, roomIndex, itemIndex, unitType) => setForm((current) => ({ ...current, sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, rooms: section.rooms.map((room, rIndex) => rIndex === roomIndex ? { ...room, items: room.items.map((item, iIndex) => {
    if (iIndex !== itemIndex) return item;
    const next = { ...item, unit_type: unitType, is_manual_total: unitType === "Custom" };
    if (unitType === "Lump Sum" && !Number(next.quantity || 0)) next.quantity = 1;
    if (unitType === "Lump Sum" && !Number(next.total || 0)) next.total = Number(next.rate || 0);
    return next;
  }) } : room) } : section) }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const payload = {
      ...form,
      title: form.title || form.project_title,
      client_id: Number(form.client_id),
      project_id: form.project_id ? Number(form.project_id) : null,
      profit_percentage: Number(form.profit_percentage || 0),
      sections: form.sections.map((section, sectionIndex) => ({
        ...section,
        sort_order: sectionIndex,
        rooms: section.rooms.map((room, roomIndex) => ({
          ...room,
          sort_order: roomIndex,
          items: room.items.map((item, itemIndex) => ({
            description: item.description,
            unit_type: item.unit_type,
            quantity: item.unit_type === "Lump Sum" ? Number(item.quantity || 1) : Number(item.quantity || 0),
            rate: Number(item.rate || 0),
            discount: Number(item.discount || 0),
            tax: Number(item.tax || 0),
            total: itemTotal(item),
            is_manual_total: Boolean(item.is_manual_total || item.unit_type === "Custom"),
            notes: item.notes,
            sort_order: itemIndex,
          })),
        })),
      })),
    };
    try {
      const quotation = id ? await updateQuotation(id, payload) : await createQuotation(payload);
      setSavedId(quotation.id);
      navigate(`/quotations/${quotation.id}`);
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save quotation.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2">
      <Link to="/quotations"><Button variant="outline">Back to Quotations</Button></Link>
      {savedId && <a href={getQuotationPreviewUrl(savedId)} target="_blank" rel="noreferrer"><Button variant="outline">Preview</Button></a>}
      {savedId && <a href={getQuotationPdfUrl(savedId)} download><Button variant="outline">Download PDF</Button></a>}
    </div>
    <Card className="p-5 md:p-6">
      <h2 className="text-xl font-bold">{id ? "Edit Structured Quotation" : "Create Structured Quotation"}</h2>
      {notice && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
      <form onSubmit={submit} className="mt-5 space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FormField label="Client"><select name="client_id" value={form.client_id} onChange={updateField} required className={fieldInputClass}><option value="">Select client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></FormField>
          <FormField label="Project"><select name="project_id" value={form.project_id} onChange={updateField} className={fieldInputClass}><option value="">No linked project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></FormField>
          <FormField label="Project title"><input name="project_title" value={form.project_title} onChange={updateField} required placeholder="Ali VILLA HOUSE" className={fieldInputClass} /></FormField>
          <FormField label="Client name snapshot"><input name="client_name" value={form.client_name} onChange={updateField} placeholder="Ali Ahmed" className={fieldInputClass} /></FormField>
          <FormField label="Location"><input name="location" value={form.location} onChange={updateField} placeholder="Mogadishu" className={fieldInputClass} /></FormField>
          <FormField label="Date"><input name="quotation_date" type="date" value={form.quotation_date} onChange={updateField} className={fieldInputClass} /></FormField>
        </div>
        <div className="rounded-2xl border border-brand-border p-4">
          <h3 className="mb-3 font-bold text-brand-primary">Create New Client</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <input placeholder="Name" value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} className={fieldInputClass} />
            <input placeholder="Phone" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: event.target.value })} className={fieldInputClass} />
            <input placeholder="Email" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} className={fieldInputClass} />
            <input placeholder="Location" value={newClient.location} onChange={(event) => setNewClient({ ...newClient, location: event.target.value })} className={fieldInputClass} />
            <Button type="button" variant="outline" onClick={async () => {
              if (!newClient.name.trim()) return;
              const client = await createClient(newClient);
              setClients((current) => [...current, client]);
              setForm((current) => ({ ...current, client_id: client.id, client_name: client.name, location: current.location || client.location }));
              setNewClient({ name: "", phone: "", email: "", location: "" });
            }}>Add</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-brand-primary">Scope of Work</h3>
            <Button type="button" variant="outline" className="px-3 py-2" onClick={addSection}>Add Floor / Section</Button>
          </div>
          <div className="space-y-5">
            {form.sections.map((section, sectionIndex) => <div key={sectionIndex} className="rounded-2xl bg-brand-soft p-4">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <input value={section.title} onChange={(event) => updateSection(sectionIndex, event.target.value)} className={`${fieldInputClass} font-bold uppercase`} />
                <Button type="button" variant="outline" className="px-3 py-2" onClick={() => addRoom(sectionIndex)}>Add Room</Button>
              </div>
              <div className="space-y-4">
                {section.rooms.map((room, roomIndex) => <div key={roomIndex} className="rounded-xl bg-white p-3">
                  <input value={room.title} onChange={(event) => updateRoom(sectionIndex, roomIndex, event.target.value)} className={`${fieldInputClass} mb-3 font-semibold`} />
                  <div className="space-y-2">
                    {room.items.map((item, itemIndex) => <div key={itemIndex} className="grid grid-cols-1 gap-2 lg:grid-cols-[2fr_.8fr_.6fr_.7fr_.6fr_.6fr_.8fr_1fr]">
                      <input value={item.description} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "description", event.target.value)} required placeholder="Wall Decoration" className={fieldInputClass} />
                      <select value={item.unit_type} onChange={(event) => changeUnitType(sectionIndex, roomIndex, itemIndex, event.target.value)} className={fieldInputClass}>{unitTypes.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                      <input value={item.quantity} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "quantity", event.target.value)} type="number" min="0" step="0.01" placeholder="Qty" className={fieldInputClass} disabled={item.unit_type === "Lump Sum"} />
                      <input value={item.rate} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "rate", event.target.value)} type="number" min="0" step="0.01" placeholder="Rate" className={fieldInputClass} />
                      <input value={item.discount} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "discount", event.target.value)} type="number" min="0" step="0.01" placeholder="Disc" className={fieldInputClass} />
                      <input value={item.tax} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "tax", event.target.value)} type="number" min="0" step="0.01" placeholder="Tax" className={fieldInputClass} />
                      {item.unit_type === "Custom" || item.unit_type === "Lump Sum"
                        ? <input value={item.total} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "total", event.target.value)} type="number" min="0" step="0.01" placeholder="Total" className={fieldInputClass} />
                        : <div className="rounded-xl bg-brand-soft px-3 py-3 text-sm font-bold">${itemTotal(item).toLocaleString()}</div>}
                      <input value={item.notes} onChange={(event) => updateItem(sectionIndex, roomIndex, itemIndex, "notes", event.target.value)} placeholder="Notes" className={fieldInputClass} />
                    </div>)}
                  </div>
                  <Button type="button" variant="outline" className="mt-3 px-3 py-2" onClick={() => addItem(sectionIndex, roomIndex)}>Add Work Item</Button>
                </div>)}
              </div>
            </div>)}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FormField label="Profit %"><input name="profit_percentage" value={form.profit_percentage} onChange={updateField} type="number" min="0" max="100" className={fieldInputClass} /></FormField>
          <div className="rounded-xl bg-brand-soft p-4"><p className="text-sm text-brand-muted">Subtotal</p><b>${totals.subtotal.toLocaleString()}</b></div>
          <div className="rounded-xl bg-brand-primary p-4 text-white"><p className="text-sm text-white/70">Grand Total</p><b>${totals.grand.toLocaleString()}</b></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormField label="Payment terms"><textarea name="payment_terms" value={form.payment_terms} onChange={updateField} rows="4" className={fieldInputClass} /></FormField>
          <FormField label="Terms & conditions"><textarea name="terms_conditions" value={form.terms_conditions} onChange={updateField} rows="4" className={fieldInputClass} /></FormField>
          <FormField label="Account name"><input name="payment_account_name" value={form.payment_account_name} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Bank"><input name="payment_bank" value={form.payment_bank} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Account no"><input name="payment_account_no" value={form.payment_account_no} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Payment phone"><input name="payment_phone" value={form.payment_phone} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Payment notes"><input name="payment_notes" value={form.payment_notes} onChange={updateField} className={fieldInputClass} /></FormField>
          <FormField label="Footer note"><input name="footer_note" value={form.footer_note} onChange={updateField} className={fieldInputClass} /></FormField>
        </div>
        <div className="flex justify-end"><Button disabled={saving}>{saving ? "Saving..." : "Save Quotation"}</Button></div>
      </form>
    </Card>
  </div>;
}

function itemTotal(item) {
  const quantity = item.unit_type === "Lump Sum" ? 1 : Number(item.quantity || 0);
  const rate = Number(item.rate || 0);
  if (item.unit_type === "Custom" || item.is_manual_total) return Math.max(Number(item.total || 0) - Number(item.discount || 0) + Number(item.tax || 0), 0);
  const base = item.unit_type === "Lump Sum" ? Number(item.total || rate || 0) : quantity * rate;
  return Math.max(base - Number(item.discount || 0) + Number(item.tax || 0), 0);
}
