/**
 * PR-10K.4: data-only monthly water export adapter.
 * PURE MODULE: no API, no D1, no file-writing, no browser dependencies.
 * Not yet connected to production AdminMonthlyReportPage.jsx.
 */
export const WATER_SLOTS = Object.freeze(['A1','A2','A3','K1','K2','K3']);
export const MONTHLY_APARTMENT_HEADERS = Object.freeze([
  'Квартира', ...WATER_SLOTS, ...WATER_SLOTS.map(x => `d_${x}`),
  'Холодная вода, m³','Горячая вода, m³','Вода всего, m³','Счётчики','Статус',
]);
export const MONTHLY_APARTMENT_LEGEND =
  'Обозначения: d_A1, d_A2, d_A3, d_K1, d_K2, d_K3 — расход воды по соответствующему счётчику (м³) относительно предыдущего показания.';
// Zero-based indices of the cells which need a left border in the header row:
// B | H | N | Q = apartment | readings | deltas | totals | meters/status.
export const HEADER_DIVIDER_INDICES = Object.freeze([1,7,13,16]);

const normalizeSlot = value => String(value ?? '').trim().toUpperCase();
const normalizeApartment = value => String(value ?? '').trim().replace(/[\s/–—]/g, c => c === '/' || c === '–' || c === '—' ? '-' : '');

function decimalOrBlank(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`PR10K4_INVALID_NUMBER:${label}`);
    return value;
  }
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const result = Number(value.trim());
    if (Number.isFinite(result)) return result;
  }
  throw new Error(`PR10K4_INVALID_NUMBER:${label}`);
}

/**
 * @param {Object} args
 * @param {Array} args.meterRows - one row for EVERY report meter (also those with no reading)
 * @param {Array} args.apartmentRows - existing per-apartment summaries (must retain existing totals)
 * @param {Function} [args.resolveSlot] - vetted resolver, default: meter.source_slot
 * @param {Function} [args.getSummary] - maps current summary into final five columns
 *
 * Throws if any meter is unplaceable/duplicated, rather than silently dropping a meter.
 * Caller must verify server-side source_slot coverage and never guess positions based on sort/type.
 */
export function buildMonthlyApartmentLayout({ meterRows, apartmentRows, resolveSlot = r => r.source_slot, getSummary } = {}) {
  if (!Array.isArray(meterRows) || !Array.isArray(apartmentRows)) {
    throw new Error('PR10K4_INVALID_INPUT');
  }
  const warnings=[];
  const positions = new Map();
  const byApartment = new Map();
  let currentNumbers=0, deltaNumbers=0, zeroDeltas=0, negativeDeltas=0;
  const errors=[];
  const meterIds=new Set();
  for (const [idx,m] of meterRows.entries()) {
    if (m.meter_id !== undefined && m.meter_id !== null) {
      const id=String(m.meter_id);
      if(meterIds.has(id)){errors.push({rowIndex:idx+1, reason:'DUPLICATE_METER_ID'});continue;}
      meterIds.add(id);
    }
    const apt=normalizeApartment(m.apartment_number);
    const slot=normalizeSlot(resolveSlot(m));
    if (!apt || !WATER_SLOTS.includes(slot)) {
      errors.push({rowIndex:idx+1, reason:'UNASSIGNED_SLOT'});
      continue;
    }
    const key=`${apt}::${slot}`;
    if (positions.has(key)) {
      errors.push({rowIndex:idx+1, reason:'DUPLICATE_APARTMENT_SLOT'});
      continue;
    }
    positions.set(key,m);
    byApartment.set(apt,(byApartment.get(apt)??0)+1);
    const meterType=String(m.type ?? '').trim().toLowerCase();
    const expected=slot.startsWith('A')?'cold':'hot';
    if (meterType && meterType !== expected) {
      warnings.push({rowIndex:idx+1, reason:'SLOT_TYPE_CONFLICT'});
    }
  }
  if (errors.length) {
    const summary=errors.reduce((a,e)=>(a[e.reason]=(a[e.reason]??0)+1,a),{});
    const exc=new Error(`PR10K4_SLOT_INTEGRITY_BLOCKED:${JSON.stringify(summary)}`);
    exc.details=errors;
    throw exc;
  }
  const summaries=new Map();
  for(const a of apartmentRows){
    const apt=normalizeApartment(a.apartment_number ?? a.number);
    if(!apt || summaries.has(apt)) throw new Error('PR10K4_APARTMENT_SUMMARY_INVALID');
    summaries.set(apt,a);
  }
  for(const apt of byApartment.keys()) if(!summaries.has(apt)) throw new Error('PR10K4_MISSING_APARTMENT_SUMMARY');
  if(summaries.size!==byApartment.size) throw new Error('PR10K4_APARTMENT_COUNT_MISMATCH');

  const rows=[ [MONTHLY_APARTMENT_LEGEND, ...Array(17).fill(null)], [...MONTHLY_APARTMENT_HEADERS] ];
  const summaryValue = getSummary ?? ((a) => [a.cold_consumption, a.hot_consumption, a.total_consumption, a.meters_count, a.status]);
  for (const [apt,a] of summaries.entries()) {
    const currents=[],deltas=[];
    for (const slot of WATER_SLOTS) {
      const m=positions.get(`${apt}::${slot}`);
      const current= m ? decimalOrBlank(m.current_reading, 'current_reading') : null;
      const delta= m ? decimalOrBlank(m.consumption, 'consumption') : null;
      if (current===null && delta!==null) throw new Error('PR10K4_DELTA_WITHOUT_CURRENT');
      if (current!==null) currentNumbers++;
      if (delta!==null){deltaNumbers++; if(delta===0) zeroDeltas++;if(delta<0) negativeDeltas++;}
      currents.push(current);deltas.push(delta);
    }
    const sums=summaryValue(a);
    if(!Array.isArray(sums) || sums.length!==5) throw new Error('PR10K4_SUMMARY_SHAPE_INVALID');
    rows.push([String(a.apartment_number ?? a.number),...currents,...deltas,...sums]);
  }
  const positioned=positions.size;
  if (positioned!==meterRows.length || rows.length!==apartmentRows.length+2 || rows.some(r=>r.length!==18)) {
    throw new Error('PR10K4_EXPORT_RECONCILIATION_FAILED');
  }
  return {rows,warnings,stats:{meters:meterRows.length,positioned,apartments:apartmentRows.length,currentNumbers,deltaNumbers,zeroDeltas,negativeDeltas},headerDividerIndices:[...HEADER_DIVIDER_INDICES]};
}
