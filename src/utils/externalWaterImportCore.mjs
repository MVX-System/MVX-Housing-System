/**
 * PR-10K.8B1 — strict, pure, offline external-water-reading candidate classifier.
 * No storage, API, authorization, or D1 writing. Server MUST re-check every invariant.
 * Values are integer milli-m³ (not floating point m³).
 */

export const REVIEW_STATUSES = Object.freeze({
  ADD: 'ADD_CANDIDATE',
  KEEP: 'KEEP_MVX',
  SAME: 'SAME_VALUE',
  SKIP: 'SKIP_BLANK',
  HOLD: 'HOLD',
});

function fail(reason) { return { ok: false, reason }; }
function trimmed(x) { return String(x ?? '').trim(); }
export function normalizeApartment(value) { return trimmed(value).toUpperCase(); }
export function normalizeSerial(value) { return trimmed(value).toUpperCase(); }
export function normalizeSlot(value) {
  const s = trimmed(value).toUpperCase();
  return /^(?:A|K)[123]$/.test(s) ? s : null;
}
export function normalizeMeterType(value) {
  const s = trimmed(value).toLowerCase();
  if (['cold', 'cw', 'aukstais', 'холодная', 'aukstais ūdens'].includes(s)) return 'cold';
  if (['hot', 'hw', 'karstais', 'горячая', 'karstais ūdens'].includes(s)) return 'hot';
  return null;
}
function meterTypeForSlot(slot) { return slot?.startsWith('A') ? 'cold' : slot?.startsWith('K') ? 'hot' : null; }

/** Strict conversion. Zero is a real reading; blank is missing; no rounding. */
export function decimalToMilli(value) {
  if (value === null || value === undefined || value === '') return {ok:true, milli:null};
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value*1000)) ||
        Math.abs(value*1000-Math.round(value*1000)) > 1e-7) return fail('INVALID_PRECISION_OR_NUMBER');
    return {ok:true,milli:Math.round(value*1000)};
  }
  const s=trimmed(value);
  if (!s) return {ok:true,milli:null};
  // No thousands separator, exponent, currency, trailing junk or ambiguous mixture.
  if (!/^\d+(?:[.,]\d+)?$/.test(s)) return fail('INVALID_DECIMAL');
  const parts=s.replace(',','.').split('.');
  const integer=parts[0];
  const fraction=(parts[1]||'');
  if (fraction.length>3 && /[^0]/.test(fraction.slice(3))) return fail('EXCESS_PRECISION');
  const n=Number(integer)*1000 + Number(fraction.slice(0,3).padEnd(3,'0')||'0');
  if (!Number.isSafeInteger(n)) return fail('VALUE_TOO_LARGE');
  return {ok:true,milli:n};
}

/**
 * @param {Object} args
 * @param {Array<Object>} args.sourceRows externally parsed rows of
 *   {apartment_number,serial_number,source_slot,type,reading_value,source_row}
 * @param {Array<Object>} args.registryRows authoritative meter-and-period snapshot.
 *   Each must include meter_id, apartment_number, serial_number, source_slot, type,
 *   active, previous_reading_milli and current_reading_milli (nullable if absent).
 * @param {number|null} args.maxMonthlyConsumptionMilli optional administrator-approved
 *   threshold; otherwise positive deltas are flagged as THRESHOLD_NOT_CONFIGURED
 *   and the result cannot be promoted to a write-ready state.
 */
export function classifyExternalWaterReadings({sourceRows,registryRows,maxMonthlyConsumptionMilli=null}={}) {
  if (!Array.isArray(sourceRows) || !Array.isArray(registryRows)) throw new TypeError('INVALID_INPUT_COLLECTIONS');
  if (maxMonthlyConsumptionMilli !== null && (!Number.isSafeInteger(maxMonthlyConsumptionMilli) || maxMonthlyConsumptionMilli < 0)) {
    throw new TypeError('INVALID_SPIKE_THRESHOLD');
  }
  // An authoritative registry entry must fully identify its meter, never infer A/K order.
  const registry=new Map();
  const ambiguous=new Set();
  for (const row of registryRows) {
    const apt=normalizeApartment(row.apartment_number), serial=normalizeSerial(row.serial_number);
    if (!apt || !serial) continue;
    const key=`${apt}\u0000${serial}`;
    if (registry.has(key)) ambiguous.add(key);
    else registry.set(key,row);
  }
  const seenIdentity=new Set(), seenSlot=new Set();
  const candidates=[];
  for (const [index,input] of sourceRows.entries()) {
    const apt=normalizeApartment(input.apartment_number), serial=normalizeSerial(input.serial_number);
    const slot=normalizeSlot(input.source_slot);
    const declaredType=trimmed(input.type);
    const type=declaredType ? normalizeMeterType(declaredType) : meterTypeForSlot(slot);
    const sourceRow=Number.isSafeInteger(input.source_row) ? input.source_row : index+1;
    const result={sourceRow, apartment_number:apt, serial_number:serial, source_slot:slot,
      type, meter_id:null, reading_milli:null, status:REVIEW_STATUSES.HOLD, reasons:[]};
    candidates.push(result);
    const setHold=(reason)=>{result.status=REVIEW_STATUSES.HOLD; result.reasons.push(reason);};
    if (!apt || !serial || !slot || !type) {setHold('INCOMPLETE_SOURCE_IDENTITY');continue;}
    if (type!==meterTypeForSlot(slot)) {setHold('SLOT_TYPE_MISMATCH');continue;}
    const identity=`${apt}\u0000${serial}`, pos=`${apt}\u0000${slot}`;
    // Any duplicate occurrence is unsafe. Second occurrence and the first are both blocked below.
    if (seenIdentity.has(identity) || seenSlot.has(pos)) {setHold('DUPLICATE_SOURCE_IDENTITY_OR_SLOT');}
    seenIdentity.add(identity); seenSlot.add(pos);
    const val=decimalToMilli(input.reading_value);
    if (!val.ok) {setHold(val.reason);continue;}
    result.reading_milli=val.milli;
    if (val.milli===null) {if(!result.reasons.length)result.status=REVIEW_STATUSES.SKIP;continue;}
    if (ambiguous.has(identity)) {setHold('AMBIGUOUS_REGISTRY_IDENTITY');continue;}
    const m=registry.get(identity);
    if (!m) {setHold('METER_NOT_FOUND_BY_APARTMENT_SERIAL');continue;}
    result.meter_id=m.meter_id ?? m.id;
    const mSlot=normalizeSlot(m.source_slot), mType=normalizeMeterType(m.type);
    if (mSlot!==slot || mType!==type) {setHold('REGISTRY_SLOT_OR_TYPE_MISMATCH');continue;}
    if (Number(m.active)!==1 && m.active!==true) {setHold('INACTIVE_METER');continue;}
    // Require explicit presence of both properties, not undefined == null.
    if (!Object.prototype.hasOwnProperty.call(m,'current_reading_milli') ||
        !Object.prototype.hasOwnProperty.call(m,'previous_reading_milli')) {
      setHold('INCOMPLETE_AUTHORITY_SNAPSHOT');continue;
    }
    const existing=m.current_reading_milli;
    if (existing!==null) {
      if (!Number.isSafeInteger(existing)) {setHold('INVALID_EXISTING_READING');continue;}
      result.status=existing===val.milli?REVIEW_STATUSES.SAME:REVIEW_STATUSES.KEEP;
      if(existing!==val.milli)result.reasons.push('EXISTING_MVX_READING_TAKES_PRIORITY');
      continue;
    }
    const previous=m.previous_reading_milli;
    if (previous===null || !Number.isSafeInteger(previous)) {setHold('MISSING_PREVIOUS_READING');continue;}
    const delta=val.milli-previous;
    result.delta_milli=delta;
    if(delta<0){setHold('NEGATIVE_CONSUMPTION');continue;}
    if(maxMonthlyConsumptionMilli===null){setHold('THRESHOLD_NOT_CONFIGURED');continue;}
    if(delta>maxMonthlyConsumptionMilli){setHold('ABOVE_REVIEW_THRESHOLD');continue;}
    if (!result.reasons.length) result.status=REVIEW_STATUSES.ADD;
  }
  // Mark both sides of any duplicate source identity / source position.
  const identityCount=new Map(), slotCount=new Map();
  for(const item of candidates){
    if(item.apartment_number&&item.serial_number){const k=`${item.apartment_number}\u0000${item.serial_number}`;identityCount.set(k,(identityCount.get(k)||0)+1);}
    if(item.apartment_number&&item.source_slot){const k=`${item.apartment_number}\u0000${item.source_slot}`;slotCount.set(k,(slotCount.get(k)||0)+1);}
  }
  for(const item of candidates){
    const idk=`${item.apartment_number}\u0000${item.serial_number}`, sk=`${item.apartment_number}\u0000${item.source_slot}`;
    if((identityCount.get(idk)||0)>1 || (slotCount.get(sk)||0)>1){
      item.status=REVIEW_STATUSES.HOLD;
      if(!item.reasons.includes('DUPLICATE_SOURCE_IDENTITY_OR_SLOT'))item.reasons.push('DUPLICATE_SOURCE_IDENTITY_OR_SLOT');
    }
  }
  const counts=Object.fromEntries(Object.values(REVIEW_STATUSES).map(k=>[k,0]));
  for(const c of candidates)counts[c.status]++;
  return {candidates,counts,preview_only:true,write_authorized:false};
}
