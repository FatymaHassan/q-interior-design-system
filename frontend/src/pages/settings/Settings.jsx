import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import Table from "../../components/ui/Table";
import { createBackup, getBackups, getSettings, saveSetting } from "../../services/api";

const sections = {
  "Company Profile": ["company_name", "company_email", "company_phone", "company_address", "currency"],
  "Attendance Location": ["attendance_office_name", "attendance_office_latitude", "attendance_office_longitude", "attendance_allowed_radius_meters"],
  "Document Prefixes": ["invoice_prefix", "quotation_prefix", "purchase_order_prefix", "default_tax_rate"],
  "Approval & Working Hours": ["expense_approval_threshold", "working_hours_start", "working_hours_end"],
  "Backup Settings": ["backup_enabled", "backup_type", "backup_time"],
  "Notification Settings": ["notifications_enabled", "daily_summary_enabled"],
};

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [backups, setBackups] = useState([]);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("loading");

  const editableKeys = useMemo(() => Object.values(sections).flat(), []);
  const defaultValues = {
    attendance_office_name: "Main Office",
    attendance_office_latitude: "0",
    attendance_office_longitude: "0",
    attendance_allowed_radius_meters: "150",
  };

  const load = () => Promise.all([getSettings(), getBackups()]).then(([settingsData, backupsData]) => {
    setSettings(settingsData);
    setBackups(backupsData);
    setForm({ ...defaultValues, ...Object.fromEntries(settingsData.map((setting) => [setting.key, setting.value])) });
    setStatus("connected");
  }).catch(() => setStatus("error"));

  useEffect(() => {
    load();
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    await Promise.all(editableKeys.map((key) => saveSetting({ key, value: form[key] || defaultValues[key] || "", type: isNumberSetting(key) ? "number" : "string" })));
    load();
  };

  const manualBackup = async () => {
    await createBackup({ backup_type: form.backup_type || "full" });
    load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="font-display text-3xl font-bold text-brand-primary">Settings</h1>
      <p className="mt-1 text-sm text-brand-muted">Company, document, approval, backup, and notification settings. English-only system configuration.</p>
    </div>

    {status === "error" && <Card className="p-4 text-sm text-brand-danger">Settings or backups could not be loaded.</Card>}

    <form onSubmit={submit} className="space-y-5">
      {Object.entries(sections).map(([title, keys]) => <Card key={title} className="p-5">
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {keys.map((key) => <FormField key={key} label={label(key)}>
            {key.includes("enabled") ? <select name={key} value={form[key] || "true"} onChange={updateField} className={fieldInputClass}><option value="true">Enabled</option><option value="false">Disabled</option></select> : key.includes("address") ? <textarea name={key} value={form[key] || ""} onChange={updateField} className={fieldInputClass} /> : <input name={key} type={isNumberSetting(key) ? "number" : "text"} step={key.includes("latitude") || key.includes("longitude") ? "0.0000001" : "1"} min={key.includes("radius") ? "10" : undefined} value={form[key] || ""} onChange={updateField} className={fieldInputClass} />}
          </FormField>)}
        </div>
      </Card>)}
      <div className="flex flex-wrap gap-2"><Button>Save Settings</Button><Button type="button" variant="outline" onClick={manualBackup}>Run Manual Backup</Button></div>
    </form>

    <Card className="p-5">
      <h2 className="mb-4 text-xl font-bold">Backup History</h2>
      <Table columns={[
        { key: "backup_type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "file_path", label: "Path" },
        { key: "file_size", label: "Size", render: (row) => `${Number(row.file_size || 0).toLocaleString()} bytes` },
        { key: "creator", label: "Created By", render: (row) => row.creator?.name || "-" },
        { key: "created_at", label: "Created", render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : "-" },
      ]} rows={backups} empty="No backups created yet." />
    </Card>

    <Card className="p-5">
      <h2 className="mb-4 text-xl font-bold">Saved Settings</h2>
      <Table columns={[{ key: "key", label: "Key" }, { key: "value", label: "Value" }, { key: "type", label: "Type" }]} rows={settings.filter((setting) => editableKeys.includes(setting.key))} />
    </Card>
  </div>;
}

function label(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isNumberSetting(key) {
  return key.includes("threshold") || key.includes("tax") || key.includes("latitude") || key.includes("longitude") || key.includes("radius");
}
