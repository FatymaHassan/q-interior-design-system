import { useEffect, useState } from "react";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import Button from "../../components/ui/Button";
import { fieldInputClass, HRPageHeader, SectionCard } from "./hrShared";
import { getOfficeLocations, saveOfficeLocation } from "../../services/api";

const emptyOffice = {
  name: "Orfano Tower",
  map_code: "28M6+9VP",
  address: "28M6+9VP, Mogadishu",
  map_url: "",
  latitude: "",
  longitude: "",
  allowed_radius_meters: "100",
  work_start_time: "08:00",
  work_end_time: "17:00",
  late_threshold_time: "08:15",
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
        map_code: current.map_code || "",
        address: current.address || "",
        map_url: current.map_url || "",
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
    const latitude = Number(office.latitude);
    const longitude = Number(office.longitude);
    const radius = Number(office.allowed_radius_meters);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setNotice("Please enter latitude and longitude. The map code is saved for reference, but GPS is needed for attendance distance checking.");
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

  const useCurrentLocation = () => {
    setNotice("");
    if (!navigator.geolocation) {
      setNotice("This browser does not support location access.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOffice((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        }));
        setSaved("Your current GPS coordinates were added. Review the radius, then save.");
      },
      () => setNotice("Could not read your location. Please allow location access or paste coordinates from Google Maps."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const pasteMapLocation = () => {
    const parsed = parseCoordinates(office.map_url || office.address || "");
    if (!parsed) {
      setNotice("Paste a Google Maps link or text that includes coordinates like 2.0314625, 45.3122031. Plus Codes can be saved, but they cannot fill GPS automatically here.");
      return;
    }

    setOffice((current) => ({
      ...current,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    }));
    setSaved("Coordinates were filled from the map text.");
  };

  return <div className="space-y-4">
    <HRPageHeader title="Attendance Schedule & Location" description="Set the office map code, GPS point, allowed radius, start time, late threshold, and leave time used by employee portal attendance." />
    {notice && <p className="rounded-lg bg-red-50 p-3 text-sm text-brand-danger">{notice}</p>}
    {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{saved}</p>}
    <section className="grid grid-cols-1 gap-4">
      <SectionCard title="Schedule & Location">
        <form onSubmit={saveOffice} className="space-y-5">
          <div className="rounded-lg border border-brand-border bg-brand-soft/60 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-brand-gold"><MapPin size={16} /> Google Maps location</div>
                <p className="mt-1 text-sm text-brand-muted">Save the place code and address you see in Google Maps, then add GPS coordinates for attendance checking.</p>
              </div>
              <Button type="button" variant="outline" onClick={useCurrentLocation} className="gap-2"><Navigation size={16} /> Use my current GPS</Button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-brand-primary">Office name<input value={office.name} onChange={(event) => updateField("name", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Orfano Tower" required /></label>
              <label className="text-sm font-semibold text-brand-primary">Status<select value={office.status} onChange={(event) => updateField("status", event.target.value)} className={`${fieldInputClass} mt-1`}><option>Active</option><option>Inactive</option></select></label>
              <label className="text-sm font-semibold text-brand-primary">Map code / Plus Code<input value={office.map_code || ""} onChange={(event) => updateField("map_code", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="28M6+9VP" /></label>
              <label className="text-sm font-semibold text-brand-primary">Address from map<input value={office.address || ""} onChange={(event) => updateField("address", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="28M6+9VP, Mogadishu" /></label>
              <label className="text-sm font-semibold text-brand-primary md:col-span-2">Google Maps link or coordinate text<input value={office.map_url || ""} onChange={(event) => updateField("map_url", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Paste Google Maps link or coordinates here" /></label>
              <div className="md:col-span-2">
                <Button type="button" variant="outline" onClick={pasteMapLocation}>Fill latitude & longitude from pasted map text</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-brand-primary">Latitude<input value={office.latitude} onChange={(event) => updateField("latitude", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Example: 2.0314625" required /></label>
            <label className="text-sm font-semibold text-brand-primary">Longitude<input value={office.longitude} onChange={(event) => updateField("longitude", event.target.value)} className={`${fieldInputClass} mt-1`} placeholder="Example: 45.3122031" required /></label>
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

function parseCoordinates(value) {
  const text = String(value || "");
  const atMatch = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const plainMatch = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const match = atMatch || plainMatch;

  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return {
    latitude: latitude.toFixed(7),
    longitude: longitude.toFixed(7),
  };
}
