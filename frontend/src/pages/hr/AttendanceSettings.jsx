import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import { getOfficeLocations, saveOfficeLocation } from "../../services/api";

const emptyOffice = {
  name: "Q INTERIOR DESIGN STUDIO",
  latitude: "",
  longitude: "",
  allowed_radius_meters: "100",
  work_start_time: "09:00",
  work_end_time: "17:00",
  late_threshold_time: "09:15",
  status: "Active",
};

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
        work_start_time: String(current.work_start_time || "09:00").slice(0, 5),
        work_end_time: String(current.work_end_time || "17:00").slice(0, 5),
        late_threshold_time: String(current.late_threshold_time || "09:15").slice(0, 5),
      });
    })
    .catch(() => setNotice("Could not load attendance schedule and location."));

  useEffect(() => { load(); }, []);

  const saveOffice = async (event) => {
    event.preventDefault();
    setNotice("");
    setSaved("");
    const latitude = Number(office.latitude);
    const longitude = Number(office.longitude);
    const radius = Number(office.allowed_radius_meters);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setNotice("Please enter the office latitude and longitude used for attendance distance checking.");
      return;
    }

    if (!Number.isFinite(radius) || radius < 10) {
      setNotice("Allowed radius must be at least 10 meters.");
      return;
    }

    await saveOfficeLocation(office.id, {
      ...office,
      latitude,
      longitude,
      allowed_radius_meters: radius,
    });
    await load();
    setSaved("Attendance schedule and location saved.");
  };

  const updateField = (field, value) => setOffice((current) => ({ ...current, [field]: value }));

  return <div className="space-y-4">
    <HRPageHeader title="Attendance Schedule & Location" description="Set the office GPS point, allowed radius, start time, late threshold, and leave time used by employee portal attendance." />
    {notice && <p className="rounded-lg bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{saved}</p>}
    <section className="grid grid-cols-1 gap-4">
      <SectionCard title="Schedule & Location">
        <form onSubmit={saveOffice} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-brand-primary">Office name<input value={office.name} onChange={(event) => updateField("name", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Q INTERIOR DESIGN STUDIO" required /></label>
            <label className="text-sm font-semibold text-brand-primary">Status<select value={office.status} onChange={(event) => updateField("status", event.target.value)} className={`${fieldInputClass} mt-1`}><option>Active</option><option>Inactive</option></select></label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-brand-primary">Latitude<input value={office.latitude} onChange={(event) => updateField("latitude", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Enter office latitude" required /></label>
            <label className="text-sm font-semibold text-brand-primary">Longitude<input value={office.longitude} onChange={(event) => updateField("longitude", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Enter office longitude" required /></label>
            <label className="text-sm font-semibold text-brand-primary">Allowed radius meters<input type="number" min="10" value={office.allowed_radius_meters} onChange={(event) => updateField("allowed_radius_meters", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="100" required /></label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-brand-primary">Start time<input type="time" value={office.work_start_time} onChange={(event) => updateField("work_start_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
            <label className="text-sm font-semibold text-brand-primary">Late after<input type="time" value={office.late_threshold_time} onChange={(event) => updateField("late_threshold_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
            <label className="text-sm font-semibold text-brand-primary">Leave time<input type="time" value={office.work_end_time} onChange={(event) => updateField("work_end_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex gap-2"><ShieldCheck size={18} className="shrink-0" /><span>Employees can check in only when their phone GPS is inside the allowed radius around this latitude and longitude.</span></div>
          </div>

          <div><Button>Save Schedule & Location</Button></div>
        </form>
      </SectionCard>
    </section>
  </div>;
}
