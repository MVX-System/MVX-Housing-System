/** PR-10K.8B4: conservative MVX registry reconciliation of external readings.
 * Pure in-memory review of already authenticated Monthly Report data. NO writes.
 * No endpoint is called here. This cannot authorize import: B5 must re-check
 * period, active meter identity, status, prior readings and uniqueness in D1.
 */
import {classifyExternalWaterReadings, REVIEW_STATUSES} from './externalWaterImportCore.mjs';

export const MATCH_STATES = Object.freeze({
  SOURCE_HOLD:'HOLD_SOURCE', MVX_HOLD:'HOLD_MVX', EXISTS:'KEEP_MVX',
  SAME:'SAME_VALUE', POLICY:'MATCHED_PENDING_POLICY',
});
const own=(a,k)=>Object.prototype.hasOwnProperty.call(a,k);
function matchPeriod(selected, reported){
  if(!selected||!reported)return false;
  if(!Number.isSafeInteger(Number(selected.period_year)) ||
     !Number.isSafeInteger(Number(selected.period_month)))return false;
  if(Number(selected.period_year)!==Number(reported.period_year) ||
     Number(selected.period_month)!==Number(reported.period_month))return false;
  if(selected.id!=null && reported.id!=null && String(selected.id)!==String(reported.id))return false;
  return true;
}
function checkReport(report, selectedPeriod) {
  if(!report || !Array.isArray(report.rows) || !matchPeriod(selectedPeriod,report.period))
    return 'REPORT_NOT_READY_FOR_SELECTED_PERIOD';
  const ids=new Set(), ident=new Set();
  for(const r of report.rows){
    const fields=['meter_id','apartment_number','serial_number','source_slot','type',
      'previous_reading','current_reading'];
    if(!fields.every(f=>own(r,f)) || !Number.isSafeInteger(Number(r.meter_id)) ||
      Number(r.meter_id)<=0 || !String(r.apartment_number??'').trim() ||
      !String(r.serial_number??'').trim() || !/^(A|K)[123]$/i.test(String(r.source_slot??'')) ||
      !['hot','cold'].includes(String(r.type??'').toLowerCase()))
      return 'INCOMPLETE_REGISTRY_SNAPSHOT';
    if(r.current_reading!==null && !Number.isSafeInteger(r.current_reading))return 'INVALID_CURRENT_IN_REGISTRY';
    if(r.previous_reading!==null && !Number.isSafeInteger(r.previous_reading))return 'INVALID_PREVIOUS_IN_REGISTRY';
    if(r.active!=null && Number(r.active)!==1)return 'INACTIVE_METER_IN_REPORT';
    if(ids.has(String(r.meter_id)))return 'DUPLICATE_METER_ID';
    ids.add(String(r.meter_id));
    const key=`${String(r.apartment_number).trim().toUpperCase()}\u0000${String(r.serial_number).trim().toUpperCase()}`;
    if(ident.has(key))return 'DUPLICATE_REGISTRY_IDENTITY';
    ident.add(key);
  }
  if(report.summary?.meters_total!=null && Number(report.summary.meters_total)!==report.rows.length)
    return 'REGISTRY_SUMMARY_MISMATCH';
  return null;
}
export function buildReadOnlyRegistryMatch(parsed, report, selectedPeriod){
  if(!parsed?.previewOnly || !Array.isArray(parsed.sourceRows) || !parsed.stats)
    throw new Error('INVALID_SOURCE_PREVIEW');
  const issue=checkReport(report,selectedPeriod);
  if(issue)return {ready:false,reason:issue,writeAuthorized:false,rows:[],counts:null};
  const registry=report.rows.map(r=>({
    meter_id:Number(r.meter_id),apartment_number:r.apartment_number,
    serial_number:r.serial_number,source_slot:r.source_slot,type:r.type,active:1,
    previous_reading_milli:r.previous_reading,current_reading_milli:r.current_reading,
  }));
  const classified=classifyExternalWaterReadings({sourceRows:parsed.sourceRows,registryRows:registry,
    maxMonthlyConsumptionMilli:null});
  const rows=classified.candidates.map((r,i)=>{
    const issues=parsed.sourceRows[i]?.source_notes??[];
    if(issues.length)return {...r,status:MATCH_STATES.SOURCE_HOLD,reasons:[...new Set([...issues,...r.reasons])],
      meter_id:null};
    if(r.status===REVIEW_STATUSES.SAME)return {...r,status:MATCH_STATES.SAME};
    if(r.status===REVIEW_STATUSES.KEEP)return {...r,status:MATCH_STATES.EXISTS};
    if(r.status===REVIEW_STATUSES.HOLD && r.reasons.length===1 &&
      r.reasons[0]==='THRESHOLD_NOT_CONFIGURED')
      return {...r,status:MATCH_STATES.POLICY};
    return {...r,status:MATCH_STATES.MVX_HOLD};
  });
  const counts={sourceHold:0,mvxHold:0,exists:0,same:0,pendingPolicy:0};
  const countKey={HOLD_SOURCE:'sourceHold',HOLD_MVX:'mvxHold',KEEP_MVX:'exists',
    SAME_VALUE:'same',MATCHED_PENDING_POLICY:'pendingPolicy'};
  for(const row of rows)counts[countKey[row.status]]++;
  if(Object.values(counts).reduce((a,b)=>a+b,0)!==parsed.sourceRows.length)
    throw new Error('MATCH_COUNT_INVARIANT_FAILED');
  return {ready:true,periodYear:Number(selectedPeriod.period_year),
    periodMonth:Number(selectedPeriod.period_month),rows,counts,
    skippedBlanks:parsed.stats.blankReadings,previewOnly:true,writeAuthorized:false,
    serverRevalidationRequired:true,registrySource:'EXISTING_ADMIN_MONTHLY_REPORT'};
}
