import { useState } from "react";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import { createHoliday } from "../../services/api";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import useHrData from "./useHrData";

export default function Holidays() {
  const { holidays, notice, reload } = useHrData(["holidays"]);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", type: "Public Holiday", description: "" });

  return <div className="space-y-6">
    <HRPageHeader title="Holiday Calendar" description="Maintain public, religious, and company holidays used by attendance and leave planning." />
    {notice && <p className="rounded-xl bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    <SectionCard title="Company Holidays">
      <form onSubmit={async (e) => { e.preventDefault(); await createHoliday(holidayForm); setHolidayForm({ name: "", date: "", type: "Public Holiday", description: "" }); reload(); }} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input required placeholder="Holiday name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className={fieldInputClass} />
        <input required type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className={fieldInputClass} />
        <select value={holidayForm.type} onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })} className={fieldInputClass}><option>Public Holiday</option><option>Company Holiday</option><option>Religious Holiday</option><option>Other</option></select>
        <Button>Add Holiday</Button>
      </form>
      <Table columns={[{ key: "name", label: "Holiday" }, { key: "date", label: "Date" }, { key: "type", label: "Type" }, { key: "description", label: "Description" }]} rows={holidays} empty="No holidays yet." />
    </SectionCard>
  </div>;
}
