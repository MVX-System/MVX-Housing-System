/** PR-10K.8B2-R4 — pure, source-only parser. No storage or network interactions.
 *
 * Conservative contract:
 * - Only right-hand I:N, Tek.periods is a reading (never previous or consumption).
 * - Blank current => SKIP, even if the serial position contains a formula.
 * - Cached formula results may be considered as candidate serial values only;
 *   these remain HOLD until a separate explicit review/revalidation step exists.
 * - Numeric serial is preserved exactly from OOXML; it is not rounded or guessed.
 * - Invalid values and ambiguous apartments are always HOLD.
 * - A preview is NEVER write permission. Actual TEST/PROD writes require new
 *   authenticated server-side checks, period locking, and transactional audit.
 */
import {classifyExternalWaterReadings, decimalToMilli} from './externalWaterImportCore.mjs';

const COLS = 'IJKLMN';
export const SOURCE_SLOTS = Object.freeze(['A1','A2','A3','K1','K2','K3']);
const TOKENS = Object.freeze({
  serial:['skait.nr','skait nr','skaitītāja nr','skaititaja nr'],
  current:['tek.periods','tek periods','tekošais periods','tekosais periods'],
  previous:['iepr.periods','iepr periods'],
});
const normalizeLabel = v => String(v ?? '').normalize('NFC').replace(/\u00a0/g,' ')
  .trim().toLowerCase().replace(/\s+/g,' ').replace(/\s*\.\s*/g,'.').replace(/:$/,'');
function err(code){const e=new Error('PR10K8B2_R4_'+code);e.code=code;return e;}
function label(sheet,key){const c=sheet[key];return !c||c.f?'':normalizeLabel(c.v ?? c.w);}
function hasToken(sheet,key,type){return TOKENS[type].includes(label(sheet,key));}
function valueAsText(cell){
  if(!cell || cell.v===undefined || cell.v===null)return '';
  return String(cell.v).normalize('NFC').trim();
}
function apartmentAt(sheet,anchor,last){
  const values=[];
  for(let row=anchor-1;row<=Math.min(anchor+5,last);row++){
    const c=sheet[`A${row}`];if(!c||c.f)continue;
    const v=valueAsText(c);if(v)values.push(v);
  }
  if(values.length!==1)return {value:'',reason:values.length?'AMBIGUOUS_APARTMENT_CELL':'MISSING_APARTMENT_CELL'};
  if(!/^\d{1,4}(?:[- ]?[A-Za-z])?$/.test(values[0]))return {value:'',reason:'INVALID_APARTMENT_FORMAT'};
  return {value:values[0].replace(/ /g,''),reason:null};
}
function readCurrent(cell){
  if(!cell || (cell.v===undefined||cell.v===null||cell.v==='') && !cell.f)
    return {blank:true,valid:false,raw:null,reason:null};
  if(cell.f) return {blank:false,valid:false,raw:null,reason:'CURRENT_IS_FORMULA'};
  if(!['n','s','str'].includes(cell.t))return {blank:false,valid:false,raw:null,reason:'INVALID_CURRENT_CELL_TYPE'};
  const raw=valueAsText(cell);
  const cv=decimalToMilli(raw);
  if(!cv.ok)return {blank:false,valid:false,raw,reason:cv.reason};
  if(cv.milli===null)return {blank:true,valid:false,raw:null,reason:null};
  return {blank:false,valid:true,raw,reason:null};
}
function readSerial(cell){
  if(!cell || cell.v===undefined || cell.v===null || cell.v===''){
    return {value:'',origin:cell?.f?'FORMULA_NO_CACHE':'BLANK',reason:cell?.f?'FORMULA_SERIAL_CACHE_MISSING':'SERIAL_MISSING'};
  }
  const raw=valueAsText(cell);
  if(!raw || raw.length>80 || /[\u0000-\u001f\u007f]/.test(raw))
    return {value:'',origin:cell.f?'FORMULA_CACHE':'INVALID',reason:'INVALID_SERIAL_FORMAT'};
  const isNumeric=cell.t==='n';
  // Numeric codes of >15 digits, decimal or exponential notation risk loss of
  // precision in Excel and must NOT be silently canonicalized.
  if(isNumeric && (!/^\d{1,15}$/.test(raw) || !Number.isSafeInteger(Number(raw))))
    return {value:'',origin:cell.f?'FORMULA_CACHE':'NUMBER',reason:'UNSAFE_NUMERIC_SERIAL'};
  if(!isNumeric && !['s','str'].includes(cell.t))
    return {value:'',origin:'OTHER',reason:'INVALID_SERIAL_TYPE'};
  // If the cell is formula-backed, treat its cached value as untrusted; a
  // separate human/authoritative comparison must clear this HOLD explicitly.
  if(cell.f)return {value:raw,origin:'FORMULA_CACHE',reason:'FORMULA_SERIAL_CACHE_REQUIRES_REVIEW'};
  return {value:raw,origin:isNumeric?'NUMBER':'TEXT',reason:null};
}
export function parseExternalWaterWorksheet(sheet,{maxRows=800}={}){
  if(!sheet || typeof sheet!=='object' || !/^[A-Z]+\d+:[A-Z]+\d+$/.test(sheet['!ref']??''))
    throw err('INVALID_WORKSHEET');
  const numbers=[...sheet['!ref'].matchAll(/\d+/g)].map(m=>Number(m[0]));
  const last=Math.max(...numbers);
  if(numbers.length!==2 || !Number.isSafeInteger(last) || last>maxRows || last<6)throw err('UNEXPECTED_DIMENSIONS');
  if(Object.keys(sheet).length>12000)throw err('TOO_MANY_CELLS');
  const anchors=[];
  for(let row=2;row<last-2;row++)if(hasToken(sheet,`B${row}`,'serial'))anchors.push(row);
  if(anchors.length<1 || anchors.length>110)throw err('UNEXPECTED_BLOCK_COUNT');
  // A1..K3 global header must occur exactly once and immediately precede first block.
  const globalHeadings=[];
  for(let row=1;row<anchors[0];row++){
    if([...COLS].every((col,i)=>label(sheet,`${col}${row}`).toUpperCase()===SOURCE_SLOTS[i]))globalHeadings.push(row);
  }
  if(globalHeadings.length!==1 || globalHeadings[0]!==anchors[0]-1)throw err('GLOBAL_HEADER_MISSING_OR_DUPLICATE');
  const sourceRows=[];
  const stats={apartmentBlocks:anchors.length,totalSlots:anchors.length*6,blankReadings:0,
    validReadings:0,invalidReadings:0,ambiguousApartmentBlocks:0,
    validFormulaSerial:0,validNumberSerial:0,validTextSerial:0,validUnsafeNumberSerial:0,
    validReadingInvalidApartment:0,sourceRows:0,requiresReview:0};
  const reasonsCount={};
  const addReason=(r)=>{if(r)reasonsCount[r]=(reasonsCount[r]||0)+1;};
  for(let idx=0;idx<anchors.length;idx++){
    const r=anchors[idx];
    if(idx && r-anchors[idx-1]<4)throw err('OVERLAPPING_BLOCKS');
    if(!hasToken(sheet,`B${r+1}`,'current') || !hasToken(sheet,`B${r+2}`,'previous'))
      throw err('UNSUPPORTED_BLOCK_LAYOUT');
    const apartment=apartmentAt(sheet,r,last);
    if(apartment.reason)stats.ambiguousApartmentBlocks++;
    for(let i=0;i<COLS.length;i++){
      const reading=readCurrent(sheet[`${COLS[i]}${r+1}`]);
      if(reading.blank){stats.blankReadings++;continue;}
      const serial=readSerial(sheet[`${COLS[i]}${r}`]);
      const issues=[apartment.reason,serial.reason,reading.reason].filter(Boolean);
      const slot=SOURCE_SLOTS[i];
      sourceRows.push({source_row:r+1,serial_row:r,apartment_number:apartment.value,
        serial_number:serial.value,source_serial_origin:serial.origin,
        source_slot:slot,type:slot[0]==='A'?'cold':'hot',
        reading_value:reading.raw,source_notes:issues});
      if(reading.valid){
        stats.validReadings++;
        if(apartment.reason)stats.validReadingInvalidApartment++;
        if(serial.origin==='FORMULA_CACHE')stats.validFormulaSerial++;
        if(serial.origin==='NUMBER'){if(serial.reason)stats.validUnsafeNumberSerial++;else stats.validNumberSerial++;}
        if(serial.origin==='TEXT')stats.validTextSerial++;
      }else stats.invalidReadings++;
      for(const note of issues)addReason(note);
      if(issues.length)stats.requiresReview++;
    }
  }
  stats.sourceRows=sourceRows.length;
  if(stats.blankReadings+stats.validReadings+stats.invalidReadings!==stats.totalSlots)
    throw err('COUNT_INVARIANT_FAILED');
  return {sourceRows,stats,reasonsCount,previewOnly:true,writeAuthorized:false};
}
export function buildExternalImportPreview(parsed,registryRows,{maxMonthlyConsumptionMilli=null}={}){
  if(!parsed?.previewOnly || !Array.isArray(parsed.sourceRows) || !Array.isArray(registryRows))throw err('INVALID_PREVIEW_INPUT');
  // Source-only classifications cannot establish current/previous readings in D1.
  const preview=classifyExternalWaterReadings({sourceRows:parsed.sourceRows,
    registryRows,maxMonthlyConsumptionMilli});
  const rows=preview.candidates.map((c,i)=>{
    const issues=parsed.sourceRows[i].source_notes??[];
    return issues.length ? {...c,status:'HOLD',reasons:[...new Set([...c.reasons,...issues])]} : c;
  });
  const counts={ADD_CANDIDATE:0,KEEP_MVX:0,SAME_VALUE:0,SKIP_BLANK:parsed.stats.blankReadings,HOLD:0};
  for(const r of rows)counts[r.status]++;
  return {rows,counts,previewOnly:true,writeAuthorized:false,
    sourceOfAuthority:'UNVERIFIED_MONTHLY_REPORT_SNAPSHOT',sourceStats:parsed.stats};
}
export function anonymizedSourceReceipt(parsed){
  if(!parsed?.previewOnly || !parsed.stats)throw err('INVALID_PARSED_SOURCE');
  // Explicitly copy aggregate-only known keys, never stringify sourceRows.
  const stats={};for(const k of Object.keys({apartmentBlocks:0,totalSlots:0,blankReadings:0,
    validReadings:0,invalidReadings:0,ambiguousApartmentBlocks:0,
    validFormulaSerial:0,validNumberSerial:0,validTextSerial:0,validUnsafeNumberSerial:0,
    validReadingInvalidApartment:0,sourceRows:0,requiresReview:0}))stats[k]=parsed.stats[k];
  return {step:'PR-10K.8B2-R4',mode:'SOURCE_ONLY_READ_ONLY',stats,
    reasonsCount:{...parsed.reasonsCount},sourceIdentifiersExported:0,
    sourceReadingsExported:0,previewOnly:true,writeAuthorized:false};
}
