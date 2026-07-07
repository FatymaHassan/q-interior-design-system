import { useEffect, useState } from "react";
import { Crosshair, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import { getOfficeLocations, saveOfficeLocation } from "../../services/api";

const emptyOffice = {
  name: "Main Office",
  latitude: "0",
  longitude: "0",
  allowed_radius_meters: "150",
  work_start_time: "09:00",
  work_end_time: "17:00",
  late_threshold_time: "09:15",
  status: "Active",
};

export default function AttendanceSettings() {
  const [office, setOffice] = useState(emptyOffice);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");
  const [debug, setDebug] = useState(null);

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
  const testLocation = () => {
    setNotice("");
    if (!navigator.geolocation) {
      setNotice("This browser does not support location checking.");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const userLatitude = position.coords.latitude;
      const userLongitude = position.coords.longitude;
      const distance = distanceMeters(Number(office.latitude), Number(office.longitude), userLatitude, userLongitude);
      setDebug({
        userLatitude,
        userLongitude,
        distance,
        accuracy: position.coords.accuracy,
        allowedRadius: Number(office.allowed_radius_meters),
      });
    }, () => setNotice("Please allow location permission to test attendance distance."), {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  };

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
            <label className="text-sm font-semibold text-brand-primary">Allowed radius meters<input type="number" min="10" step="1" value={office.allowed_radius_meters} onChange={(event) => updateField("allowed_radius_meters", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="150" required /></label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-brand-primary">Start time<input type="time" value={office.work_start_time} onChange={(event) => updateField("work_start_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
            <label className="text-sm font-semibold text-brand-primary">Late after<input type="time" value={office.late_threshold_time} onChange={(event) => updateField("late_threshold_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
            <label className="text-sm font-semibold text-brand-primary">Leave time<input type="time" value={office.work_end_time} onChange={(event) => updateField("work_end_time", event.target.value)} className={`${fieldInputClass} mt-1`} /></label>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex gap-2"><ShieldCheck size={18} className="shrink-0" /><span>Employees can check in only when their phone GPS is inside the allowed radius around this latitude and longitude.</span></div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button>Save Schedule & Location</Button>
            <Button type="button" variant="outline" className="gap-2" onClick={testLocation}><Crosshair size={16} />Test Current GPS</Button>
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Attendance Location Debug">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DebugTile label="Office latitude" value={office.latitude || "-"} />
          <DebugTile label="Office longitude" value={office.longitude || "-"} />
          <DebugTile label="Allowed radius" value={`${office.allowed_radius_meters || 0} m`} />
          <DebugTile label="User latitude" value={debug ? debug.userLatitude.toFixed(7) : "-"} />
          <DebugTile label="User longitude" value={debug ? debug.userLongitude.toFixed(7) : "-"} />
          <DebugTile label="Distance" value={debug ? `${debug.distance.toFixed(0)} m` : "-"} />
          <DebugTile label="GPS accuracy" value={debug ? `${debug.accuracy.toFixed(0)} m` : "-"} />
          <DebugTile label="Result" value={debug ? (debug.distance <= debug.allowedRadius ? "Inside radius" : "Outside radius") : "Not tested"} />
        </div>
        {debug?.accuracy > 100 && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-brand-warning">Your GPS accuracy is low. Please move to an open area or try again.</p>}
      </SectionCard>
    </section>
  </div>;
}

function DebugTile({ label, value }) {
  return <div className="rounded-lg border border-brand-border bg-white p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">{label}</p>
    <b className="mt-1 block text-brand-primary">{value}</b>
  </div>;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const earth = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return value * (Math.PI / 180);
}
