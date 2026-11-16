/** PR-10K.8B3 — immutable, local source-only review model.
 * This module DOES NOT query an MVX registry, authorize writes, or imply D1 matching.
 */
export const PREVIEW_STATES = Object.freeze({
  HOLD: 'HOLD_SOURCE',
  CHECK: 'AWAIT_MVX_MATCH',
});

export function inferMonthYearFromFileName(fileName) {
  const name = String(fileName ?? '').normalize('NFC');
  // Recognize an explicit numeric m-yyyy or yyyy-m near separators, never infer from arbitrary digits.
  const tokens = [...name.matchAll(/(?:^|[^0-9])(?:(0?[1-9]|1[0-2])[-_. ]+(20\d{2})|(20\d{2})[-_. ]+(0?[1-9]|1[0-2]))(?=$|[^0-9])/g)];
  if (tokens.length !== 1) return null;
  const t = tokens[0];
  return {month: Number(t[1] ?? t[4]), year: Number(t[2] ?? t[3])};
}

export function assertFilePeriod(name, period) {
  if (!period || !Number.isInteger(Number(period.period_month)) || !Number.isInteger(Number(period.period_year)) ||
    Number(period.period_month) < 1 || Number(period.period_month) > 12 ||
    Number(period.period_year) < 2020 || Number(period.period_year) > 2100) throw new Error('PERIOD_NOT_SELECTED');
  if (!String(name ?? '').toLowerCase().endsWith('.xlsx')) throw new Error('XLSX_REQUIRED');
  const declared = inferMonthYearFromFileName(name);
  if (declared && (declared.month !== Number(period.period_month) || declared.year !== Number(period.period_year))) {
    throw new Error('FILE_PERIOD_MISMATCH');
  }
  return {period_month: Number(period.period_month), period_year: Number(period.period_year),
    filePeriodExplicit: Boolean(declared)};
}

export function buildSourceOnlyPreview(parsed, {fileName, period}={}) {
  assertFilePeriod(fileName, period);
  if (!parsed || parsed.previewOnly !== true || !parsed.stats || !Array.isArray(parsed.sourceRows))
    throw new Error('INVALID_PARSE_RESULT');
  const sourceRows = parsed.sourceRows;
  const summary = parsed.stats;
  if (sourceRows.length !== summary.validReadings + summary.invalidReadings ||
    summary.totalSlots !== summary.blankReadings + summary.validReadings + summary.invalidReadings) {
    throw new Error('INCONSISTENT_PARSE_COUNTS');
  }
  const rows = sourceRows.map(item => ({
    source_row: item.source_row,
    apartment_number: item.apartment_number,
    serial_number: item.serial_number,
    source_slot: item.source_slot,
    reading_value: item.reading_value,
    status: item.source_notes?.length ? PREVIEW_STATES.HOLD : PREVIEW_STATES.CHECK,
    reasons: [...(item.source_notes ?? [])],
  }));
  const counts = {
    holdSource: rows.filter(r => r.status === PREVIEW_STATES.HOLD).length,
    awaitingMvxMatch: rows.filter(r => r.status === PREVIEW_STATES.CHECK).length,
    skippedBlanks: summary.blankReadings,
    validFormat: summary.validReadings,
    invalidFormat: summary.invalidReadings,
  };
  if (counts.holdSource !== summary.requiresReview ||
      counts.holdSource + counts.awaitingMvxMatch !== sourceRows.length) {
    throw new Error('INCONSISTENT_HOLD_COUNTS');
  }
  return {
    rows, counts,
    sourceStats: { ...summary },
    reasonsCount: { ...(parsed.reasonsCount ?? {}) },
    period: {period_month:Number(period.period_month),period_year:Number(period.period_year)},
    sourceFileName: String(fileName),
    previewOnly: true,
    writeAuthorized: false,
    registryVerified: false,
    dataSentToServer: false,
  };
}
