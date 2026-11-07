/** PR-10K.4F — read-only anomaly review for an existing monthly water report.
 * Pure data module. Does NOT modify readings, totals, meters or billing.
 * All values supplied to this module are already in m³, not stored D1 units.
 */
export const HIGH_CONSUMPTION_M3 = 20;
export const COMPARISON_TOLERANCE_M3 = 0.0011;
export const ANOMALY_HEADER_ROW = 6;
export const ANOMALY_COLUMNS = 12;

const COPY = {
 ru: {
  name:'Нестандартные значения', title:'Аудит нестандартных значений', critical:'Критично', review:'Проверить', total:'Всего замечаний', apartments:'Квартир с замечаниями', threshold:'Порог расхода (м³/счётчик)', tolerance:'Допуск сравнения (м³)', checked:'Проверено счётчиков', missing:'Нет текущих показаний',
  note:'Автоматические сигналы для проверки бухгалтером/администратором; не являются доказательством ошибки или основанием для автоматического изменения начислений. Отсутствующие показания перечислены на отдельном листе.',
  headers:['Уровень','Код','Квартира','Позиция','Тип воды','Серийный номер','Стояк','Было, м³','Стало, м³','Расход, м³','Причина / оценка','Рекомендуемое действие'],
  cold:'Холодная',hot:'Горячая', negative:'Отрицательный расход', high:'Расход выше контрольного порога', discrepancy:'Расход не совпадает с разностью показаний', riser:'Тип воды противоречит коду стояка CW/HW', slot:'Тип воды противоречит позиции A/K', totalMismatch:'Сумма расходов не совпадает с итогом квартиры',
  aNegative:'Проверить предыдущие и текущие показания, привязку счётчика и возможную замену.', aHigh:'Проверить ввод и фактический расход; порог эвристический, не норматив.', aDifference:'Проверить сохранённый расход и историю счётчика.', aRiser:'Сверить тип воды и фактический стояк; автоматически ничего не менять.', aSlot:'Сверить source_slot и тип воды; автоматически ничего не менять.', aTotal:'Сверить итог и правила учёта отрицательных расходов до начисления.',
  empty:'Замечаний по действующим правилам не обнаружено.',
  totalExplain:(sum,reported)=>`Сумма всех переданных расходов: ${sum.toFixed(3)} м³; итог в отчёте: ${reported.toFixed(3)} м³ (возможно, отрицательный расход исключён из итога).`,
  highExplain:(d,threshold)=>`Расход ${d.toFixed(3)} м³ превышает контрольный порог ${threshold} м³; это сигнал для проверки, не норматив.`,
  diffExplain:(computed,reported)=>`По показаниям ${computed.toFixed(3)} м³, в отчёте ${reported.toFixed(3)} м³.`,
 },
 en: {
  name:'Anomaly Review', title:'Unusual-value review', critical:'Critical',review:'Review',total:'Total findings',apartments:'Apartments flagged',threshold:'High-usage threshold (m³/meter)',tolerance:'Comparison tolerance (m³)',checked:'Meters checked',missing:'Missing current readings',
  note:'Automatic review signals only, not proof of error or grounds for changing billing. Missing readings are listed on a separate worksheet.',
  headers:['Severity','Code','Apartment','Slot','Water type','Serial number','Riser','Previous, m³','Current, m³','Usage, m³','Reason / assessment','Recommended action'],
  cold:'Cold',hot:'Hot',negative:'Negative consumption',high:'Usage above review threshold',discrepancy:'Usage differs from reading difference',riser:'Water type conflicts with CW/HW riser code',slot:'Water type conflicts with A/K slot',totalMismatch:'Meter usage sum differs from apartment total',
  aNegative:'Check readings, meter mapping and possible meter replacement.',aHigh:'Verify input and actual use; heuristic threshold, not a standard.',aDifference:'Check stored usage and meter history.',aRiser:'Check actual riser and type; do not change automatically.',aSlot:'Check source_slot and water type; do not change automatically.',aTotal:'Reconcile totals and exclusion of negative usage before billing.',empty:'No findings under the current review rules.',
  totalExplain:(sum,reported)=>`Sum of all submitted usages: ${sum.toFixed(3)} m³; reported total: ${reported.toFixed(3)} m³ (negative usage may be excluded).`,
  highExplain:(d,threshold)=>`Usage ${d.toFixed(3)} m³ exceeds the ${threshold} m³ review threshold; not a regulatory limit.`,
  diffExplain:(computed,reported)=>`Reading difference ${computed.toFixed(3)} m³, reported usage ${reported.toFixed(3)} m³.`,
 },
 lv: {
  name:'Nestandarta vērtības',title:'Nestandarta vērtību pārbaude',critical:'Kritiski',review:'Pārbaudīt',total:'Konstatēts kopā',apartments:'Dzīvokļi ar piezīmēm',threshold:'Patēriņa slieksnis (m³/skaitītājs)',tolerance:'Salīdzinājuma pielaide (m³)',checked:'Pārbaudīti skaitītāji',missing:'Nav aktuālo rādījumu',
  note:'Automātiski pārbaudes signāli; tie nepierāda kļūdu un nav pamats automātiski mainīt aprēķinus. Trūkstošie rādījumi ir citā darblapā.',
  headers:['Svarīgums','Kods','Dzīvoklis','Pozīcija','Ūdens tips','Sērijas numurs','Stāvvads','Iepriekš, m³','Tagad, m³','Patēriņš, m³','Iemesls / novērtējums','Ieteicamā darbība'],
  cold:'Aukstais',hot:'Karstais',negative:'Negatīvs patēriņš',high:'Patēriņš virs pārbaudes sliekšņa',discrepancy:'Patēriņš neatbilst rādījumu starpībai',riser:'Ūdens tips neatbilst CW/HW stāvvadam',slot:'Ūdens tips neatbilst A/K pozīcijai',totalMismatch:'Patēriņu summa neatbilst dzīvokļa kopsummai',
  aNegative:'Pārbaudīt rādījumus, skaitītāja piesaisti un iespējamu nomaiņu.',aHigh:'Pārbaudīt ievadi un patēriņu; slieksnis nav normatīvs.',aDifference:'Pārbaudīt saglabāto patēriņu un vēsturi.',aRiser:'Pārbaudīt faktisko stāvvadu un tipu; automātiski nemainīt.',aSlot:'Pārbaudīt source_slot un ūdens tipu; automātiski nemainīt.',aTotal:'Pirms aprēķina pārbaudīt negatīva patēriņa apstrādi.',empty:'Saskaņā ar pārbaudes noteikumiem piezīmes nav atrastas.',
  totalExplain:(sum,reported)=>`Visu iesniegto patēriņu summa: ${sum.toFixed(3)} m³; pārskata kopsumma: ${reported.toFixed(3)} m³ (negatīvs patēriņš var nebūt ieskaitīts).`,
  highExplain:(d,threshold)=>`Patēriņš ${d.toFixed(3)} m³ pārsniedz ${threshold} m³ pārbaudes slieksni; tas nav normatīvs.`,
  diffExplain:(computed,reported)=>`Rādījumu starpība ${computed.toFixed(3)} m³, pārskatā ${reported.toFixed(3)} m³.`,
 },
};

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) return Number(value.trim());
  throw new Error('PR10K4F_INVALID_NUMERIC_VALUE');
};
const str = value => String(value ?? '').trim();
const safeText = value => {
  const s = str(value);
  return /^[=+@\-\t\r]/.test(s) ? `'${s}` : s;
};
const aptKey = value => str(value).replace(/[\/–—]/g, '-').replace(/\s/g, '');
const waterType = value => {
  const t = str(value).toLowerCase();
  return t === 'cold' || t === 'hot' ? t : null;
};
const safeSlot = value => /^[AK][123]$/.test(str(value).toUpperCase()) ? str(value).toUpperCase() : '';

/**
 * Input: report meter rows and per-apartment totals already expressed in m³.
 * Details use the authenticated report API, never data from historic Excel mapping.
 * No missing-reading flood: these are counted and remain on the separate sheet.
 */
export function buildMonthlyWaterAnomalyReview({meterRows, apartmentRows, language='ru', periodName='', thresholdM3=HIGH_CONSUMPTION_M3}={}) {
  if (!Array.isArray(meterRows) || !Array.isArray(apartmentRows) || !Number.isFinite(thresholdM3) || thresholdM3<=0) throw new Error('PR10K4F_INVALID_INPUT');
  const t=COPY[String(language ?? 'ru').toLowerCase().split('-')[0]] || COPY.ru;
  const alerts=[];
  const meterIds=new Set();
  const rollup=new Map();
  let missing=0;
  const add=(severity,code,meter,description,action) => {
    alerts.push({severity,code,apartment:aptKey(meter.apartment_number),slot:safeSlot(meter.source_slot),type:waterType(meter.type),serial:safeText(meter.serial_number),riser:safeText(meter.riser_code),previous:numberOrNull(meter.previous_reading),current:numberOrNull(meter.current_reading),delta:numberOrNull(meter.consumption),description,action});
  };
  for(const meter of meterRows) {
    if (!meter || typeof meter !== 'object') throw new Error('PR10K4F_INVALID_METER');
    const apt=aptKey(meter.apartment_number);
    if(!apt) throw new Error('PR10K4F_MISSING_APARTMENT');
    const id = meter.meter_id == null ? null : String(meter.meter_id);
    if(id !== null){if(meterIds.has(id)) throw new Error('PR10K4F_DUPLICATE_METER');meterIds.add(id);}
    const p=numberOrNull(meter.previous_reading),c=numberOrNull(meter.current_reading),d=numberOrNull(meter.consumption);
    const ty=waterType(meter.type);
    if(!ty) throw new Error('PR10K4F_INVALID_WATER_TYPE');
    if(c===null) missing++;
    if(d!==null) {
      if(!rollup.has(apt)) rollup.set(apt,{cold:0,hot:0,all:0});
      const obj=rollup.get(apt);obj[ty]+=d;obj.all+=d;
    }
    if(d!==null && d < -COMPARISON_TOLERANCE_M3) add('critical','NEGATIVE_DELTA',meter,t.negative,t.aNegative);
    else if(c!==null && p!==null && c < p - COMPARISON_TOLERANCE_M3) add('critical','REVERSED_READING',meter,t.negative,t.aNegative);
    if(d!==null && d > thresholdM3) add('review','HIGH_DELTA',meter,t.highExplain(d,thresholdM3),t.aHigh);
    if(p!==null && c!==null && d!==null && Math.abs((c-p)-d) > COMPARISON_TOLERANCE_M3) add('critical','DELTA_MISMATCH',meter,t.diffExplain(c-p,d),t.aDifference);
    const riserPrefix=/^(CW|HW)(?:-|$)/i.exec(str(meter.riser_code))?.[1]?.toUpperCase();
    if(riserPrefix && ((riserPrefix==='CW' && ty==='hot') || (riserPrefix==='HW' && ty==='cold'))) add('review','RISER_TYPE_CONFLICT',meter,t.riser,t.aRiser);
    const slot=safeSlot(meter.source_slot);
    if (slot && ((slot.startsWith('A') && ty==='hot') || (slot.startsWith('K') && ty==='cold'))) add('review','SLOT_TYPE_CONFLICT',meter,t.slot,t.aSlot);
  }
  const apartmentIds=new Set();
  for(const a of apartmentRows){
    const apt=aptKey(a.apartment_number);
    if(!apt || apartmentIds.has(apt)) throw new Error('PR10K4F_INVALID_APARTMENT_SUMMARY');
    apartmentIds.add(apt);
    const src=rollup.get(apt) || {cold:0,hot:0,all:0};
    const cold=numberOrNull(a.cold_consumption),hot=numberOrNull(a.hot_consumption),total=numberOrNull(a.total_consumption);
    if(cold===null||hot===null||total===null) throw new Error('PR10K4F_MISSING_TOTALS');
    if(Math.abs(src.cold-cold)>COMPARISON_TOLERANCE_M3 || Math.abs(src.hot-hot)>COMPARISON_TOLERANCE_M3 || Math.abs(src.all-total)>COMPARISON_TOLERANCE_M3) {
      add('review','APARTMENT_TOTAL_REVIEW',{apartment_number:apt,previous_reading:null,current_reading:null,consumption:null},t.totalExplain(src.all,total),t.aTotal);
    }
  }
  const order={critical:0,review:1};
  alerts.sort((a,b)=>order[a.severity]-order[b.severity] || a.apartment.localeCompare(b.apartment,'en',{numeric:true}) || a.code.localeCompare(b.code) || a.serial.localeCompare(b.serial));
  const critical=alerts.filter(a=>a.severity==='critical').length;
  const review=alerts.length-critical;
  const differentApartments=new Set(alerts.map(a=>a.apartment)).size;
  const rows = [
   [`${t.title}${periodName ? ` — ${safeText(periodName)}` : ''}`],
   [t.critical,critical,t.review,review,t.total,alerts.length,t.apartments,differentApartments],
   [t.threshold,thresholdM3,t.tolerance,COMPARISON_TOLERANCE_M3,t.checked,meterRows.length,t.missing,missing],
   [t.note],
   [],
   t.headers,
  ];
  for(const a of alerts){
    rows.push([a.severity==='critical'?t.critical:t.review,a.code,a.apartment,a.slot,a.type===null?'':(a.type==='cold'?t.cold:t.hot),a.serial,a.riser,a.previous,a.current,a.delta,a.description,a.action]);
  }
  if(!alerts.length) rows.push([t.empty]);
  return {sheetName:t.name, rows, issues:alerts, counts:{critical,review,total:alerts.length,apartments:differentApartments,metersChecked:meterRows.length,missingReadings:missing},headerRow:ANOMALY_HEADER_ROW};
}

/** Apply conservative styling only on new worksheet. Existing sheets untouched. */
export function styleMonthlyWaterAnomalyWorksheet(sheet, review) {
  if(!sheet || !review) throw new Error('PR10K4F_INVALID_STYLE_INPUT');
  const letters='ABCDEFGHIJKL';
  sheet['!cols']=[11,25,13,11,16,20,20,15,15,15,61,58].map(wch=>({wch}));
  sheet['!rows']=[{hpt:28},{hpt:22},{hpt:22},{hpt:42},{hpt:8},{hpt:26}];
  sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:11}},{s:{r:3,c:0},e:{r:3,c:11}}];
  sheet['!autofilter']={ref:`A6:L${review.rows.length}`};
  for(let i=0;i<12;i++){
    const header=sheet[`${letters[i]}6`];
    if(!header) throw new Error(`PR10K4F_MISSING_HEADER_${i}`);
    header.s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'334155'}},alignment:{vertical:'center',wrapText:true},border:{bottom:{style:'medium',color:{rgb:'94A3B8'}}}};
  }
  const title=sheet.A1;if(title)title.s={font:{bold:true,sz:15,color:{rgb:'0F172A'}},alignment:{vertical:'center'}};
  const desc=sheet.A4;if(desc)desc.s={font:{italic:true,color:{rgb:'475569'},sz:10},alignment:{wrapText:true,vertical:'center'}};
  for(let row=7;row<=review.rows.length;row++){
    const severity=sheet[`A${row}`];
    const critical=review.issues[row-7]?.severity==='critical';
    if(severity) severity.s={font:{bold:true,color:{rgb:critical?'991B1B':'92400E'}},fill:{fgColor:{rgb:critical?'FEE2E2':'FEF3C7'}}};
    for(const col of ['H','I','J']){
      const cell=sheet[`${col}${row}`];if(cell && cell.t==='n') cell.z='0.000';
    }
  }
  return sheet;
}
