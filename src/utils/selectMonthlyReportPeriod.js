// Pure report-navigation preference; never controls reading submission rights.
const newestFirst = (a, b) =>
  Number(b.period_year) - Number(a.period_year) ||
  Number(b.period_month) - Number(a.period_month);

export function selectDefaultMonthlyReportPeriod(periods, fallback = null, now = new Date()) {
  const rows = Array.isArray(periods) ? periods.filter((row) =>
    row && Number.isInteger(Number(row.period_year)) &&
    Number.isInteger(Number(row.period_month))
  ) : [];

  const open = rows.filter((row) => row.status === "open")
    .sort(newestFirst)[0];
  if (open) return open;

  const instant = now.getTime();
  const next = rows.filter((row) =>
    row.status === "scheduled" &&
    Number.isFinite(Date.parse(row.collection_opens_at)) &&
    Date.parse(row.collection_opens_at) > instant
  ).sort((a, b) =>
    Date.parse(a.collection_opens_at) - Date.parse(b.collection_opens_at) ||
    newestFirst(a, b)
  )[0];
  if (next) return next;

  const closed = rows.filter((row) => row.status === "closed")
    .sort(newestFirst)[0];
  if (closed) return closed;

  const finalized = rows.filter((row) => row.status === "finalized")
    .sort(newestFirst)[0];
  return finalized || fallback;
}
