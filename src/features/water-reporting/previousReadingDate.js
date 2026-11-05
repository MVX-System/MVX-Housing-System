/**
 * PR-10K.1I.1: display the date of the last *actual submission* in Europe/Riga.
 * Receives /api/my-water-meters.last_date (wmr.submitted_at), never a reporting
 * period or a generated reading_date. No timestamp => no invented date.
 */
export function formatPreviousReadingDate(value) {
  if (typeof value !== 'string') return '—';
  const raw = value.trim();
  // The API sends ISO UTC timestamps; tolerate SQLite UTC timestamp strings.
  // Deliberately reject a bare YYYY-MM-DD: it does not prove submission time.
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i.test(raw)) {
    return '—';
  }
  const iso = raw.replace(' ', 'T');
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(iso) ? iso : `${iso}Z`;
  const date = new Date(withZone);
  if (!Number.isFinite(date.getTime())) return '—';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Riga', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.day}.${parts.month}.${parts.year}`;
}
