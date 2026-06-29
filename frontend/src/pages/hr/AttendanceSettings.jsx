import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import { getOfficeLocations, saveOfficeLocation } from "../../services/api";

const emptyOffice = { name: "SOMOIL CAR WASH", latitude: "2.0314625", longitude: "45.3122031", allowed_radius_meters: "100", work_start_time: "08:00", work_end_time: "17:00", late_threshold_time: "08:15", status: "Active" };

export default function AttendanceSettings() {
  const [office, setOffice] = useState(emptyOffice);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");

  const load = () => getOfficeLocations()
    .then((locations) => {
      const current = locations[0];
      if (current) setOffice({
        ...current,
        latitude: current.latitude || "",
        longitude: current.longitude || "",
        allowed_radius_meters: current.allowed_radius_meters || "",
        work_start_time: String(current.work_start_time || "08:00").slice(0, 5),
        work_end_time: String(current.work_end_time || "17:00").slice(0, 5),
        late_threshold_time: String(current.late_threshold_time || "08:15").slice(0, 5),
      });
    })
    .catch(() => setNotice("Could not load attendance schedule and location."));

  useEffect(() => { load(); }, []);

  const saveOffice = async (event) => {
    event.preventDefault();
    setNotice("");
    setSaved("");
    await saveOfficeLocation(office.id, {
      ...office,
      latitude: Number(office.latitude),
      longitude: Number(office.longitude),
      allowed_radius_meters: Number(office.allowed_radius_meters),
    });
    await load();
    setSaved("Attendance schedule and location saved.");
  };

  return <div className="space-y-4">
    <HRPageHeader title="Attendance Schedule & Location" description="Set the office location, allowed radius, start time, late threshold, and leave time used by employee portal attendance." />
    {notice && <p className="rounded-lg bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{saved}</p>}
    <section className="grid grid-cols-1 gap-4">
      <SectionCard title="Schedule & Location">
        <form onSubmit={saveOffice} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input value={office.name} onChange={(event) => setOffice({ ...office, name: event.target.value })} className={fieldInputClass} placeholder="Office name" />
          <select value={office.status} onChange={(event) => setOffice({ ...office, status: event.target.value })} className={fieldInputClass}><option>Active</option><option>Inactive</option></select>
          <input value={office.latitude} onChange={(event) => setOffice({ ...office, latitude: event.target.value })} className={fieldInputClass} placeholder="Latitude" />
          <input value={office.longitude} onChange={(event) => setOffice({ ...office, longitude: event.target.value })} className={fieldInputClass} placeholder="Longitude" />
          <input type="number" value={office.allowed_radius_meters} onChange={(event) => setOffice({ ...office, allowed_radius_meters: event.target.value })} className={fieldInputClass} placeholder="Allowed radius meters" />
          <label className="text-sm font-semibold text-brand-primary">Start time<input type="time" value={office.work_start_time} onChange={(event) => setOffice({ ...office, work_start_time: event.target.value })} className={`${fieldInputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-brand-primary">Late after<input type="time" value={office.late_threshold_time} onChange={(event) => setOffice({ ...office, late_threshold_time: event.target.value })} className={`${fieldInputClass} mt-1`} /></label>
          <label className="text-sm font-semibold text-brand-primary">Leave time<input type="time" value={office.work_end_time} onChange={(event) => setOffice({ ...office, work_end_time: event.target.value })} className={`${fieldInputClass} mt-1`} /></label>
          <div className="md:col-span-2"><Button>Save Schedule & Location</Button></div>
        </form>
      </SectionCard>
    </section>
  </div>;
}
