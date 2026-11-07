/**
 * PR-10K.4I — Client-side, read-only interpretation of monthly water reporting.
 *
 * The existing API's summary.apartments_submitted counts only apartments for
 * which every active meter has a current reading. Do not change that contract;
 * derive "any", "partial" and "none" from the same authenticated report rows.
 * A submitted zero counts as a reading; a negative consumption is an anomaly,
 * but still has a current reading. Missing previous reading is a missing-data
 * condition even when the current reading exists.
 */
const STATES = new Set([
  'complete', 'missing_current', 'missing_previous', 'negative_consumption',
]);
const MISSING_STATES = new Set(['missing_current', 'missing_previous']);

export const isMissingReadingStatus = (status) => MISSING_STATES.has(status);

export function summarizeMonthlySubmissionCoverage(meterRows) {
  if (!Array.isArray(meterRows)) throw new Error('PR10K4I_INVALID_ROWS');
  const apartments = new Map();
  const seenMeters = new Set();
  let readingsReceived = 0;
  let missingCurrent = 0;
  let missingPrevious = 0;
  let negative = 0;

  for (const row of meterRows) {
    if (!row || typeof row !== 'object') throw new Error('PR10K4I_INVALID_ROW');
    const id = String(row.apartment_id ?? '').trim();
    if (!id) throw new Error('PR10K4I_MISSING_APARTMENT');
    if (!STATES.has(row.status)) throw new Error('PR10K4I_UNKNOWN_STATUS');
    if (row.meter_id != null) {
      const meterKey = String(row.meter_id);
      if (seenMeters.has(meterKey)) throw new Error('PR10K4I_DUPLICATE_METER');
      seenMeters.add(meterKey);
    }
    const hasCurrent = row.current_reading !== null &&
      row.current_reading !== undefined && row.current_reading !== '';
    if (hasCurrent && !Number.isFinite(Number(row.current_reading))) {
      throw new Error('PR10K4I_INVALID_READING');
    }
    if (hasCurrent === (row.status === 'missing_current')) {
      throw new Error('PR10K4I_STATUS_READING_CONFLICT');
    }
    if (row.status === 'missing_previous') missingPrevious++;
    if (row.status === 'negative_consumption') negative++;
    if (hasCurrent) readingsReceived++;
    else missingCurrent++;
    const apartment = apartments.get(id) || {total:0,received:0};
    apartment.total++;
    if (hasCurrent) apartment.received++;
    apartments.set(id, apartment);
  }

  let complete = 0;
  let partial = 0;
  let none = 0;
  for (const apartment of apartments.values()) {
    if (apartment.received === apartment.total) complete++;
    else if (apartment.received === 0) none++;
    else partial++;
  }
  const total = apartments.size;
  const any = complete + partial;
  const withMissing = partial + none;
  if (any + none !== total || complete + withMissing !== total ||
      readingsReceived + missingCurrent !== meterRows.length) {
    throw new Error('PR10K4I_COVERAGE_INVARIANT');
  }
  return Object.freeze({
    total, any, complete, partial, none, withMissing,
    metersTotal: meterRows.length, readingsReceived, missingCurrent,
    missingPrevious, negative,
  });
}

/** The API's apartments_submitted means complete, not any. */
export function assertMonthlyCoverageMatchesSummary(coverage, apiSummary) {
  if (!coverage || !apiSummary || typeof apiSummary !== 'object') {
    throw new Error('PR10K4I_MISSING_API_SUMMARY');
  }
  const checks = {
    apartments_total: coverage.total,
    apartments_submitted: coverage.complete,
    apartments_missing: coverage.withMissing,
    meters_total: coverage.metersTotal,
    meters_submitted: coverage.readingsReceived,
    meters_missing: coverage.missingCurrent,
  };
  for (const [name, expected] of Object.entries(checks)) {
    if (apiSummary[name] == null || !Number.isFinite(Number(apiSummary[name])) ||
        Number(apiSummary[name]) !== expected) {
      throw new Error(`PR10K4I_API_SUMMARY_MISMATCH_${name}`);
    }
  }
  return true;
}

/** The five explicitly named apartment metrics for the Summary worksheet. */
export function buildMonthlyCoverageSummaryRows(labels, coverage) {
  const keys = ['apartmentsAny','apartmentsSubmitted','apartmentsPartial','apartmentsNone','apartmentsMissing'];
  const values = [coverage?.any, coverage?.complete, coverage?.partial, coverage?.none, coverage?.withMissing];
  if (!labels || keys.some(k => typeof labels[k] !== 'string' || !labels[k]) ||
      values.some(v => !Number.isInteger(v) || v < 0)) {
    throw new Error('PR10K4I_INVALID_SUMMARY_ROWS');
  }
  return keys.map((key,i) => [labels[key],values[i]]);
}

/** Strictly exclude negative consumption and complete rows from Missing Data. */
export function selectMissingMonthlyReadingRows(meterRows) {
  if (!Array.isArray(meterRows)) throw new Error('PR10K4I_INVALID_MISSING_ROWS');
  for (const row of meterRows) {
    if (!row || !STATES.has(row.status)) throw new Error('PR10K4I_UNKNOWN_MISSING_STATUS');
  }
  return meterRows.filter(row => isMissingReadingStatus(row.status));
}
