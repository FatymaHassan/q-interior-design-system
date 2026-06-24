import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { downloadReportExport, getReport, getReportsCenter } from "../../services/api";

export default function ReportsCenter() {
  const [center, setCenter] = useState({ groups: {}, filters: {} });
  const [active, setActive] = useState("profit-loss");
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading");
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: "", start_date: "", end_date: "", project_id: "", client_id: "", supplier_id: "", employee_id: "", status: "", search: "" });

  useEffect(() => {
    getReportsCenter().then((data) => {
      setCenter(data);
      const first = Object.values(data.groups || {})[0]?.[0]?.key || "profit-loss";
      setActive(first);
      setStatus("connected");
    }).catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!active) return;
    getReport(active, clean(filters)).then(setReport).catch(() => setStatus("error"));
  }, [active]);

  const rows = report?.rows || [];
  const columns = useMemo(() => {
    const first = rows[0] || {};
    return Object.keys(first).map((key) => ({ key, label: human(key), render: (row) => renderCell(row[key]) }));
  }, [rows]);

  const refresh = () => getReport(active, clean(filters)).then(setReport);
  const exportReport = (format) => downloadReportExport(active, format, clean(filters));

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">Phase 7</p>
        <h1 className="font-display text-3xl font-bold text-brand-primary">Reports Center</h1>
        <p className="mt-1 text-sm text-brand-muted">Finance, projects, quotations, HR, inventory, exports, and print-ready views.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => exportReport("excel")}>Excel</Button>
        <Button type="button" variant="outline" onClick={() => exportReport("pdf")}>PDF</Button>
        <Button type="button" onClick={() => exportReport("print")}>Print</Button>
      </div>
    </div>

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Reports could not be loaded. Please check the backend connection.</Card>}

    <Card className="p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <FormField label="Year"><input type="number" value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Month"><select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} className={fieldInputClass}><option value="">All</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></FormField>
        <FormField label="Start"><input type="date" value={filters.start_date} onChange={(event) => setFilters({ ...filters, start_date: event.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="End"><input type="date" value={filters.end_date} onChange={(event) => setFilters({ ...filters, end_date: event.target.value })} className={fieldInputClass} /></FormField>
        <FormField label="Project"><select value={filters.project_id} onChange={(event) => setFilters({ ...filters, project_id: event.target.value })} className={fieldInputClass}><option value="">All</option>{(center.filters?.projects || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Client"><select value={filters.client_id} onChange={(event) => setFilters({ ...filters, client_id: event.target.value })} className={fieldInputClass}><option value="">All</option>{(center.filters?.clients || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Supplier"><select value={filters.supplier_id} onChange={(event) => setFilters({ ...filters, supplier_id: event.target.value })} className={fieldInputClass}><option value="">All</option>{(center.filters?.suppliers || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <div className="flex items-end"><Button type="button" className="w-full" onClick={refresh}>Apply</Button></div>
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <div className="space-y-5">
          {Object.entries(center.groups || {}).map(([group, reports]) => <section key={group}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-brand-muted">{group}</h2>
            <div className="space-y-2">
              {reports.map((item) => <button key={item.key} onClick={() => setActive(item.key)} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${active === item.key ? "bg-brand-primary text-white" : "bg-brand-soft text-brand-primary hover:bg-brand-border/60"}`}>{item.title}</button>)}
            </div>
          </section>)}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-primary">{report?.title || "Report"}</h2>
            <p className="text-sm text-brand-muted">{rows.length} record(s)</p>
          </div>
          <input placeholder="Search this view" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className={`${fieldInputClass} md:max-w-xs`} />
        </div>
        <Table columns={columns} rows={filterRows(rows, filters.search)} empty="No report records found." />
      </Card>
    </div>
  </div>;
}

function clean(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function human(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderCell(value) {
  if (typeof value === "number") return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function filterRows(rows, search) {
  if (!search) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
}
