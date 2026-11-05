/**
 * PR-10K.1 — pure water reading form logic.
 * Units are thousandths of m³ to prevent binary floating-point rounding errors.
 * No environment-specific API calls are made in this module.
 */

export function parseCubicMetres(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().replace(/\u00a0/g, '').replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const wholeNumber = Number(whole);
  const fractionalNumber = Number(fraction.padEnd(3, '0'));
  const result = wholeNumber * 1000 + fractionalNumber;
  return Number.isSafeInteger(result) ? result : null;
}

export function formatCubicMetres(milli, locale = 'ru') {
  if (!Number.isSafeInteger(milli) || milli < 0) return '—';
  const separator = locale === 'en' ? '.' : ',';
  return `${Math.floor(milli / 1000)}${separator}${String(milli % 1000).padStart(3, '0')}`;
}

export function meterStatus(meter, rawInput, leaveUnchanged) {
  const previous = parseCubicMetres(meter.previous);
  if (meter.submitted === true) {
    const current = parseCubicMetres(meter.submittedValue);
    return { ready: current !== null, previous, current,
      consumption: current !== null && previous !== null ? current - previous : null,
      error: current === null ? 'invalid' : null, submitted: true };
  }
  if (leaveUnchanged) {
    if (previous === null) {
      return { ready: false, previous, current: null, consumption: null, error: 'no_previous' };
    }
    return { ready: true, previous, current: previous, consumption: 0, error: null };
  }

  if (rawInput === null || rawInput === undefined || String(rawInput).trim() === '') {
    return { ready: false, previous, current: null, consumption: null, error: 'missing' };
  }
  const current = parseCubicMetres(rawInput);
  if (current === null) {
    return { ready: false, previous, current: null, consumption: null, error: 'invalid' };
  }
  if (previous !== null && current < previous) {
    return { ready: false, previous, current, consumption: null, error: 'below_previous' };
  }
  return {
    ready: true,
    previous,
    current,
    consumption: previous === null ? null : current - previous,
    error: null,
  };
}

export function calculateFormState(meters, drafts = {}, unchanged = {}) {
  const states = {};
  let completed = 0;
  let calculated = 0;
  let totalConsumption = 0;
  for (const meter of meters) {
    const key = String(meter.id);
    const state = meterStatus(meter, drafts[key], unchanged[key] === true);
    states[key] = state;
    if (state.ready) completed += 1;
    if (state.ready && state.consumption !== null) {
      totalConsumption += state.consumption;
      calculated += 1;
    }
  }
  const pending = meters.filter(m => m.submitted !== true).length;
  return {
    states,
    completed,
    calculated,
    total: meters.length,
    pending,
    totalConsumption,
    canSubmit: pending > 0 && completed === meters.length,
  };
}

const locationCodes = {
  bath: 'bathroom', bathroom: 'bathroom', 'ванная': 'bathroom', 'ванная комната': 'bathroom', 'ванна': 'bathroom', 'vannas istaba': 'bathroom',
  kitchen: 'kitchen', 'кухня': 'kitchen', virtuve: 'kitchen',
  other: 'other', 'другое': 'other', cits: 'other',
};
const locationTitles = {
  ru: { bathroom: 'Ванная', kitchen: 'Кухня', other: 'Другое', unknown: 'Расположение не указано' },
  lv: { bathroom: 'Vannas istaba', kitchen: 'Virtuve', other: 'Cits', unknown: 'Atrašanās vieta nav norādīta' },
  en: { bathroom: 'Bathroom', kitchen: 'Kitchen', other: 'Other', unknown: 'Location not specified' },
};

export function getLocationName(meter, locale = 'ru') {
  const value = meter.location;
  const raw = typeof value === 'string' ? value.trim() : '';
  const key = locationCodes[raw.toLowerCase()];
  const titles = locationTitles[locale] || locationTitles.ru;
  if (key) return titles[key];
  return raw || titles.unknown;
}

export function groupMetersByLocation(meters, locale = 'ru') {
  const groups = new Map();
  for (const meter of meters) {
    const location = getLocationName(meter, locale);
    if (!groups.has(location)) groups.set(location, []);
    groups.get(location).push(meter);
  }
  const titles = locationTitles[locale] || locationTitles.ru;
  const order = [titles.bathroom, titles.kitchen, titles.other, titles.unknown];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rankA = order.indexOf(a) === -1 ? 3 : order.indexOf(a);
      const rankB = order.indexOf(b) === -1 ? 3 : order.indexOf(b);
      return rankA - rankB || a.localeCompare(b, locale);
    })
    .map(([name, items]) => ({ name, meters: items }));
}

/**
 * Client-side payload contract. Server MUST revalidate authorisation, period,
 * ownership, readings and duplicates, and commit the whole batch atomically.
 * Never send submitted_at/reading_date from the client.
 */
export function buildSubmission({ meters, drafts, unchanged, reportingPeriodId }) {
  if (reportingPeriodId === null || reportingPeriodId === undefined || reportingPeriodId === '') {
    throw new Error('Reporting period is required');
  }
  const ids = meters.map(m => String(m.id));
  if (ids.some(id => !id || id === 'undefined' || id === 'null') || new Set(ids).size !== ids.length) {
    throw new Error('Invalid or duplicated meter ID');
  }
  const state = calculateFormState(meters, drafts, unchanged);
  if (!state.canSubmit) throw new Error('All meter readings must be valid');
  return {
    reportingPeriodId,
    readings: meters.filter(m => m.submitted !== true).map(m => {
      const meterId = String(m.id);
      return {
        meterId,
        value: formatCubicMetres(state.states[meterId].current, 'en'),
        unchanged: unchanged[meterId] === true,
        expectedPrevious: state.states[meterId].previous,
      };
    }),
  };
}
