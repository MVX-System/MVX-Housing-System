/**
 * PR-10K.2 — exact, inclusive multi-number filters.
 * Pure JavaScript; no dependencies or data access. Review before wiring into PROD.
 */
export function parseNumberRanges(input, label = "Значение") {
  const text = String(input ?? "").normalize("NFKC").trim();
  if (!text) return { active: false, ranges: [], error: null };
  if (text.length > 512) return { active: true, ranges: [], error: `${label}: слишком длинный фильтр` };
  const normalized = text.replace(/[\u2012\u2013\u2014\u2212]/g, "-").replace(/\s*-\s*/g, "-");
  const parts = normalized.split(/[\s,;]+/).filter(Boolean);
  if (parts.length > 128) return { active: true, ranges: [], error: `${label}: слишком много элементов` };
  const ranges = [];
  for (const part of parts) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) return { active: true, ranges: [], error: `${label}: недопустимый элемент «${part}». Используйте 2, 3-5, 9` };
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from > 1000000 || to > 1000000) {
      return { active: true, ranges: [], error: `${label}: число вне допустимых границ` };
    }
    if (from > to) return { active: true, ranges: [], error: `${label}: диапазон «${part}» указан в обратном порядке` };
    ranges.push([from, to]);
  }
  ranges.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const merged = [];
  for (const [start,end] of ranges) {
    const last = merged[merged.length-1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start,end]);
  }
  return { active: true, ranges: merged, error: null };
}

export function includesExactNumber(spec, numericValue) {
  if (!spec?.active) return true;
  if (spec.error) return false;
  return spec.ranges.some(([from, to]) => numericValue >= from && numericValue <= to);
}

function exactInteger(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null;
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

export function matchesSection(spec, value) {
  if (!spec?.active) return true;
  const text = String(value ?? '').trim();
  const prefixed = /^E\s*-?\s*(\d+)$/i.exec(text);
  const valueNumber = exactInteger(text) ?? (prefixed ? Number(prefixed[1]) : null);
  return valueNumber !== null && includesExactNumber(spec, valueNumber);
}

export function matchesFloor(spec, value) {
  if (!spec?.active) return true;
  const n = exactInteger(value);
  return n !== null && includesExactNumber(spec, n);
}

export function matchesApartment(spec, value) {
  if (!spec?.active) return true;
  const text = String(value ?? '').trim();
  const single = exactInteger(text);
  if (single !== null) return includesExactNumber(spec, single);
  // Apartment pairs (e.g. 28-29 or 28/29) are a single combined apartment.
  // Either member selects the pair; no substring matching (22 never matches 122).
  const pair = /^(\d+)\s*[-\/]\s*(\d+)$/.exec(text);
  if (!pair) return false;
  return includesExactNumber(spec, Number(pair[1])) || includesExactNumber(spec, Number(pair[2]));
}

/** All independent filters are AND-ed. Preserve the existing universal text search separately. */
export function matchesLocationFilters(meter, specs) {
  return matchesSection(specs.section, meter.apartment_section)
    && matchesFloor(specs.floor, meter.apartment_floor)
    && matchesApartment(specs.apartment, meter.apartment_number);
}
