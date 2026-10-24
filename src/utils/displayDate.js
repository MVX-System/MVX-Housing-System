// Public display only: never modify stored ISO values or HTML date inputs.
// Civil dates (YYYY-MM-DD) stay as written; UTC timestamps are shown in Europe/Riga.
const pad = (value) => String(value).padStart(2, "0");

function parts(value, time = false) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value);
  const civil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (civil) return { y: civil[1], m: civil[2], d: civil[3], h: "00", min: "00" };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga", year: "numeric", month: "2-digit",
    day: "2-digit", ...(time ? {hour: "2-digit", minute: "2-digit", hourCycle: "h23"} : {}),
  });
  const values = Object.fromEntries(fmt.formatToParts(date).map(({type, value}) => [type, value]));
  return { y: values.year, m: values.month, d: values.day,
    h: values.hour || "00", min: values.minute || "00" };
}

export function formatMvxDate(value) {
  if (!value) return "—";
  const p = parts(value);
  return p ? `${p.d}.${p.m}.${p.y}` : String(value);
}
export function formatMvxDateTime(value) {
  if (!value) return "—";
  const p = parts(value, true);
  return p ? `${p.d}.${p.m}.${p.y} ${p.h}:${p.min}` : String(value);
}
