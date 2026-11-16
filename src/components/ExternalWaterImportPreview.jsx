/** PR-10K.8B3 — local XLSX preview for authenticated Monthly Report.
 * No backend API calls, persistence, export, import POST or write controls.
 * React unmounts this component on reporting-period change (key=period.id).
 */
import { useMemo, useRef, useState } from 'react';
import { parseExternalWaterWorksheet } from '../utils/externalWaterXlsxParser.mjs';
import { readRawExternalWaterWorksheet } from '../utils/externalWaterRawOOXML.mjs';
import { assertFilePeriod, buildSourceOnlyPreview, PREVIEW_STATES } from '../utils/externalWaterImportPreviewModel.mjs';
import { buildReadOnlyRegistryMatch } from '../utils/externalWaterRegistryPreview.mjs';

const I18N = {
  lv: {
    title: 'Ārējo ūdens skaitītāju rādījumu priekšskatījums', choose: 'Izvēlēties Excel failu',
    warning: 'Tikai priekšskatījums un salīdzināšana ar MVX. Ierakstīšana datubāzē vēl nav pieejama.',
    period: 'Izvēlētais pārskata periods', file: 'Izvēlētais fails', inspecting: 'Notiek faila pārbaude…',
    blocks: 'Dzīvokļu bloki', valid: 'Pareiza formāta rādījumi', blanks: 'Tukšās pozīcijas', invalid: 'Nederīgs formāts',
    hold: 'Jāpārbauda Excel dati (HOLD)', match: 'Jāsalīdzina ar MVX',
    details: 'Parādīt vietējā faila ierakstus administratoram', onlyHold: 'Rādīt tikai HOLD',
    apartment: 'Dzīvoklis', serial: 'Skaitītāja numurs', slot: 'Pozīcija', reading: 'Rādījums, m³',
    status: 'Pārbaudes statuss', reasons: 'Iemesli', clear: 'Notīrīt priekšskatījumu',
    empty: 'Nav rādāmu ierakstu.', truncated: 'Parādītas pirmās 60 rindas no atlases.',
    error: 'Failu nevar apstrādāt', awaiting: 'Izvēlieties .xlsx failu no šīs ierīces; faila ceļš netiek saglabāts.',
    noPeriod: 'Pirms faila izvēles norādiet pārskata periodu.',
    matchTitle: 'Salīdzināšana ar MVX (bez saglabāšanas)', matchPending:'MVX dati izvēlētajam periodam vēl nav gatavi',
    matchSourceHold:'Excel HOLD', matchMvxHold:'MVX HOLD', matchExists:'MVX rādījums jau ir', matchSame:'Vienāda vērtība MVX', matchPolicy:'Atbilst, jāapstiprina importa noteikumi',
  },
  en: {
    title: 'External water readings — local preview', choose: 'Choose Excel file',
    warning: 'Preview and matching with MVX only. Database import remains disabled.',
    period: 'Selected reporting period', file: 'Selected file', inspecting: 'Checking file…',
    blocks: 'Apartment blocks', valid: 'Valid-format readings', blanks: 'Blank slots', invalid: 'Invalid format',
    hold: 'Source records requiring review (HOLD)', match: 'Awaiting MVX matching',
    details: 'Show local source records to administrator', onlyHold: 'Show HOLD only',
    apartment: 'Apartment', serial: 'Meter serial', slot: 'Slot', reading: 'Reading, m³',
    status: 'Review status', reasons: 'Reasons', clear: 'Clear preview',
    empty: 'No rows to show.', truncated: 'Showing the first 60 selected rows.',
    error: 'Cannot process file', awaiting: 'Choose an .xlsx file on this device; the path is never stored.',
    noPeriod: 'Select a reporting period before choosing a file.',
    matchTitle: 'MVX meter matching (no saving)', matchPending:'MVX report for this period is not ready',
    matchSourceHold:'Excel HOLD', matchMvxHold:'MVX HOLD', matchExists:'Already in MVX', matchSame:'Same value in MVX', matchPolicy:'Matched, import policy review needed',
  },
  ru: {
    title: 'Внешние показания воды — локальный просмотр', choose: 'Выбрать Excel-файл',
    warning: 'Только предварительный просмотр и сопоставление с MVX. Запись в базу пока отключена.',
    period: 'Выбранный отчётный период', file: 'Выбранный файл', inspecting: 'Проверка файла…',
    blocks: 'Квартирных блоков', valid: 'Показаний корректного формата', blanks: 'Пустых позиций', invalid: 'Некорректный формат',
    hold: 'Требуют проверки Excel (HOLD)', match: 'Ожидают сверки с MVX',
    details: 'Показать администратору записи локального файла', onlyHold: 'Только HOLD',
    apartment: 'Квартира', serial: 'Серийный номер', slot: 'Позиция', reading: 'Показание, м³',
    status: 'Статус проверки', reasons: 'Причины', clear: 'Очистить просмотр',
    empty: 'Нет строк для отображения.', truncated: 'Показаны первые 60 строк выборки.',
    error: 'Не удалось обработать файл', awaiting: 'Выберите .xlsx на этом устройстве; путь не сохраняется.',
    noPeriod: 'Перед выбором файла укажите отчётный период.',
    matchTitle: 'Сопоставление со счётчиками MVX (без записи)', matchPending:'Отчёт MVX за выбранный период ещё не готов',
    matchSourceHold:'Excel HOLD', matchMvxHold:'MVX HOLD', matchExists:'Уже есть в MVX', matchSame:'Совпадает с MVX', matchPolicy:'Совпадает счётчик, требуется проверка условий импорта',
  },
};

const displayError = err => {
  const code = String(err?.code ?? err?.message ?? 'UNKNOWN_ERROR');
  // Never echo raw XML / library exception text that might contain worksheet data.
  return /^[A-Z][A-Z0-9_]{2,70}$/.test(code) ? code : 'INVALID_OR_UNSUPPORTED_XLSX';
};
const tableCell = {padding:'7px 9px',borderBottom:'1px solid #e5e7eb',textAlign:'left',fontSize:12,verticalAlign:'top'};

export default function ExternalWaterImportPreview({language='lv', period, registryReport=null}) {
  const t = I18N[language] ?? I18N.en;
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [parsedSource, setParsedSource] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [onlyHold, setOnlyHold] = useState(true);
  const clear = () => {
    setPreview(null); setParsedSource(null); setError(''); setShowDetails(false); setOnlyHold(true); setSelectedName('');
    if (inputRef.current) inputRef.current.value = '';
  };
  const choose = async event => {
    const file = event.target.files?.[0];
    clear();
    if (!file) return;
    setSelectedName(file.name);
    setBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024 || file.size === 0) throw new Error('FILE_SIZE_OUT_OF_RANGE');
      assertFilePeriod(file.name, period);
      // Exact raw OOXML numeric strings: no SheetJS / IEEE-754 normalization.
      // Pure browser memory; no fetch, upload, or writes.
      const buffer = await file.arrayBuffer();
      const sheet = await readRawExternalWaterWorksheet(buffer);
      const parsed = parseExternalWaterWorksheet(sheet);
      setPreview(buildSourceOnlyPreview(parsed, {fileName:file.name,period}));
      setParsedSource(parsed);
    } catch (err) {
      setError(displayError(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const matched=useMemo(() => {
    if(!parsedSource || !period)return null;
    try{return buildReadOnlyRegistryMatch(parsedSource,registryReport,period);}
    catch{return {ready:false,reason:'REGISTRY_PREVIEW_UNAVAILABLE',writeAuthorized:false};}
  }, [parsedSource,registryReport,period]);
  const shownRows=matched?.ready ? matched.rows : preview?.rows ?? [];
  const filtered = onlyHold ? shownRows.filter(r=>r.status===PREVIEW_STATES.HOLD || r.status==='HOLD_MVX') : shownRows;
  const visible = filtered.slice(0,60);
  return <section aria-label={t.title} style={{padding:16,border:'1px solid #cbd5e1',borderRadius:14,margin:'18px 0',background:'#fff'}}>
    <h2 style={{fontSize:17,margin:'0 0 10px'}}>{t.title}</h2>
    <p style={{fontSize:13,margin:'8px 0',color:'#374151'}}>{t.warning}</p>
    <p style={{fontSize:13}}>{t.period}: <strong>{period ? `${String(period.period_month).padStart(2,'0')}.${period.period_year}` : '—'}</strong></p>
    <label style={{fontSize:13,fontWeight:650,display:'block',marginBottom:6}} htmlFor="mvx-pr10k8-source-file">{t.choose}</label>
    <input id="mvx-pr10k8-source-file" ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} disabled={busy || !period} aria-label={t.choose}
      style={{position:'absolute',width:1,height:1,padding:0,margin:-1,overflow:'hidden',clip:'rect(0,0,0,0)',whiteSpace:'nowrap',border:0}} />
    <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
      <button type="button" disabled={busy || !period} onClick={()=>inputRef.current?.click()}
        style={{background:'#fff',border:'1px solid #94a3b8',borderRadius:8,padding:'7px 11px',fontSize:13,cursor:busy || !period?'not-allowed':'pointer'}}>{t.choose}</button>
      {selectedName && <span style={{fontSize:12,color:'#334155',overflowWrap:'anywhere'}}>{selectedName}</span>}
    </div>
    {!period && <p style={{color:'#b91c1c',fontSize:12}}>{t.noPeriod}</p>}
    {!preview && !busy && !error && <p style={{color:'#6b7280',fontSize:12}}>{t.awaiting}</p>}
    {busy && <p role="status" style={{fontSize:13}}>{t.inspecting}</p>}
    {error && <p role="alert" style={{color:'#b91c1c',fontSize:13}}>{t.error}: {error}</p>}
    {preview && <>

      <div style={{display:'flex',flexWrap:'wrap',gap:12,fontSize:13,marginTop:10}}>
        {[[t.blocks,preview.sourceStats.apartmentBlocks],[t.valid,preview.counts.validFormat],
          [t.blanks,preview.counts.skippedBlanks],[t.invalid,preview.counts.invalidFormat],
          [t.hold,preview.counts.holdSource],[t.match,preview.counts.awaitingMvxMatch]
        ].map(([label,value])=><div key={label} style={{border:'1px solid #e5e7eb',padding:'8px 10px',borderRadius:8}}><div style={{fontSize:11,color:'#6b7280'}}>{label}</div><strong style={{fontVariantNumeric:'tabular-nums'}}>{value}</strong></div>)}
      </div>
      <div style={{marginTop:14,padding:10,border:'1px solid #d1d5db',borderRadius:8}}>
        <strong style={{fontSize:13}}>{t.matchTitle}</strong>
        {!matched?.ready ? <p style={{fontSize:12}}>{t.matchPending}</p> :
          <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8,fontSize:12}}>
            {[[t.matchSourceHold,matched.counts.sourceHold],[t.matchMvxHold,matched.counts.mvxHold],
              [t.matchExists,matched.counts.exists],[t.matchSame,matched.counts.same],
              [t.matchPolicy,matched.counts.pendingPolicy]].map(([name,num])=><span key={name}>{name}: <strong>{num}</strong></span>)}
          </div>}
      </div>
      <label style={{display:'block',fontSize:13,marginTop:12}}>
        <input type="checkbox" checked={showDetails} onChange={event=>setShowDetails(event.target.checked)} /> {t.details}
      </label>
      {showDetails && <>
        <label style={{display:'block',fontSize:12,margin:'10px 0'}}>
          <input type="checkbox" checked={onlyHold} onChange={event=>setOnlyHold(event.target.checked)} /> {t.onlyHold}
        </label>
        <div style={{maxHeight:430,overflow:'auto'}}>
          <table style={{borderCollapse:'collapse',width:'100%',minWidth:680}}><thead><tr>
            {[t.apartment,t.slot,t.serial,t.reading,t.status,t.reasons].map(label=><th scope="col" key={label} style={tableCell}>{label}</th>)}
          </tr></thead><tbody>{visible.map((row,i)=><tr key={`${row.source_row}-${row.source_slot}-${i}`}>
            <td style={tableCell}>{row.apartment_number || '—'}</td>
            <td style={tableCell}>{row.source_slot}</td>
            <td style={tableCell}>{row.serial_number || '—'}</td>
            <td style={tableCell}>{row.reading_value ?? '—'}</td>
            <td style={tableCell}>{row.status}</td>
            <td style={tableCell}>{row.reasons.join(', ') || '—'}</td>
          </tr>)}</tbody></table>
        </div>
        {!visible.length && <p style={{fontSize:12}}>{t.empty}</p>}
        {filtered.length > visible.length && <p style={{fontSize:12}}>{t.truncated}</p>}
      </>}
      <button type="button" onClick={clear} style={{marginTop:14,padding:'7px 11px',border:'1px solid #9ca3af',borderRadius:8,background:'#fff'}}>{t.clear}</button>
    </>}
  </section>;
}
