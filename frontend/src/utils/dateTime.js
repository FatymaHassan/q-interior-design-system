export const SOMALIA_TIME_ZONE = "Africa/Mogadishu";

export function formatDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.000000)?Z)?$/);
    if (dateOnly) return dateOnly[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SOMALIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SOMALIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function todayInSomalia() {
  return formatDateOnly(new Date());
}

export function formatTableValue(value) {
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000000)?Z$/.test(value)) return formatDateOnly(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  return value;
}
