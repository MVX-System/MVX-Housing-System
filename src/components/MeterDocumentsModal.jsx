import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { api, apiFile } from '../services/api';

const I18N = {
  ru: {title:'Документы счётчика', upload:'Добавить документ', act:'Акт замены счётчика',
    other:'Прочий документ', recommended:'Акт замены желателен, но не обязателен. Его можно добавить позже.',
    noDocs:'Документы пока не прикреплены.', name:'Описание (необязательно)', file:'Файл',
    link:'Связать с другими счётчиками той же квартиры', save:'Загрузить', cancel:'Закрыть',
    none:'Выберите файл', format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; до 20 МБ на файл',
    uploadError:'Не удалось загрузить документ', loadError:'Не удалось получить список документов',
    downloadError:'Не удалось открыть документ', loading:'Загрузка…', uploaded:'Документ загружен',
    required:'Выберите файл.', size:'Файл превышает 20 МБ.', view:'Скачать', meters:'Счётчиков в акте'},
  en: {title:'Meter documents', upload:'Add document', act:'Replacement act',other:'Other attachment',
    recommended:'A replacement act is recommended, not required. You can attach it later.',
    noDocs:'No documents attached yet.',name:'Description (optional)',file:'File',
    link:'Link to other meters in the same apartment',save:'Upload',cancel:'Close',
    none:'Select a file',format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; up to 20 MB per file',
    uploadError:'Document upload failed',loadError:'Cannot load documents',downloadError:'Cannot open document',
    loading:'Loading…',uploaded:'Document uploaded',required:'Select a file.',size:'File exceeds 20 MB.',
    view:'Download',meters:'Linked meters'},
  lv: {title:'Skaitītāja dokumenti',upload:'Pievienot dokumentu',act:'Skaitītāja nomaiņas akts',other:'Cits pielikums',
    recommended:'Nomaiņas akts ir vēlams, bet nav obligāts. To var pievienot vēlāk.',
    noDocs:'Dokumenti vēl nav pievienoti.',name:'Apraksts (nav obligāts)',file:'Fails',
    link:'Piesaistīt citiem tā paša dzīvokļa skaitītājiem',save:'Augšupielādēt',cancel:'Aizvērt',
    none:'Izvēlieties failu',format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; līdz 20 MB katram failam',
    uploadError:'Neizdevās augšupielādēt dokumentu',loadError:'Neizdevās ielādēt dokumentus',
    downloadError:'Neizdevās atvērt dokumentu',loading:'Ielāde…',uploaded:'Dokuments pievienots',
    required:'Izvēlieties failu.',size:'Fails ir lielāks par 20 MB.',view:'Lejupielādēt',meters:'Saistītie skaitītāji'}
};
const ALLOWED = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.edoc,.asice';
const MAX_BYTES=20*1024*1024;

export default function MeterDocumentsModal({meter, metersInApartment=[],language='en',onClose}) {
  const text=I18N[language]||I18N.en;
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [kind,setKind]=useState('replacement_act');
  const [title,setTitle]=useState('');
  const [file,setFile]=useState(null);
  const [selectedIds,setSelectedIds]=useState([]);
  const meterId=meter?.id;
  const peers=useMemo(()=>metersInApartment.filter(m=>Number(m.apartment_id)===Number(meter?.apartment_id)),[metersInApartment,meter?.apartment_id]);
  useEffect(()=>{
    if (!meterId) {setRows([]);setSelectedIds([]);setFile(null);setError('');return;}
    let cancelled=false;
    setSelectedIds([Number(meterId)]);
    setFile(null);setTitle('');setKind('replacement_act');setLoading(true);setError('');
    api(`/api/admin/water-meter-documents?meter_id=${Number(meterId)}`)
      .then(data=>{if (!cancelled){if (data?.error) throw Error(data.error);setRows(data?.documents||[]);}})
      .catch(err=>{if (!cancelled)setError(`${text.loadError}: ${err.message}`);})
      .finally(()=>{if (!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[meterId]);
  async function upload(event) {
    event.preventDefault();
    if (!file) {setError(text.required);return;}
    if (file.size>MAX_BYTES || file.size<=0) {setError(text.size);return;}
    if (!selectedIds.includes(Number(meterId))) {setError('Current meter must be linked');return;}
    setBusy(true);setError('');
    try {
      const fd=new FormData();
      fd.append('file',file);
      fd.append('document_kind',kind);
      fd.append('display_title',title);
      fd.append('meter_ids',JSON.stringify(selectedIds));
      const result=await api('/api/admin/water-meter-document',{method:'POST',body:fd});
      if (!result?.ok) throw Error(result?.error||text.uploadError);
      const refreshed=await api(`/api/admin/water-meter-documents?meter_id=${Number(meterId)}`);
      if (!refreshed?.ok) throw Error(refreshed?.error||text.loadError);
      setRows(refreshed.documents||[]);setFile(null);setTitle('');
      setSelectedIds([Number(meterId)]);
    } catch (err) {setError(`${text.uploadError}: ${err.message}`);} finally {setBusy(false);}
  }
  async function download(doc) {
    setError('');
    try {
      const response=await apiFile(`/api/admin/water-meter-document?id=${encodeURIComponent(doc.id)}`);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=doc.original_filename||'document';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(err) {setError(`${text.downloadError}: ${err.message}`);}
  }
  return <Modal open={Boolean(meter)} title={`${text.title} · ${meter?.serial_number||''}`} onClose={()=>{if(!busy) onClose?.();}}>
    <div style={{display:'grid',gap:14,maxWidth:680}}>
      <p style={{fontSize:13,color:'var(--text)',margin:0}}>{text.recommended}</p>
      {loading ? <p>{text.loading}</p> : rows.length ?
        <ul style={{paddingLeft:18,margin:0,display:'grid',gap:8}}>
          {rows.map(doc=><li key={doc.id}>
            <button type="button" onClick={()=>download(doc)} style={{cursor:'pointer',textDecoration:'underline',border:0,background:'transparent',color:'var(--text-h)',fontWeight:600}}>{doc.display_title||doc.original_filename}</button>
            <span style={{fontSize:12,color:'var(--text)',marginLeft:8}}>{doc.document_kind==='replacement_act'?text.act:text.other} · {doc.meter_links} {text.meters}</span>
          </li>)}
        </ul> : <p style={{fontSize:13,margin:0}}>{text.noDocs}</p>}
      <form onSubmit={upload} style={{display:'grid',gap:10}}>
        <strong>{text.upload}</strong>
        <select value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}>
          <option value="replacement_act">{text.act}</option><option value="other">{text.other}</option>
        </select>
        <label>{text.name}<input style={{display:'block',width:'100%'}} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} disabled={busy}/></label>
        <label>{text.file}<input name="file" type="file" accept={ALLOWED} onChange={e=>setFile(e.target.files?.[0]||null)} disabled={busy}/></label>
        <small>{text.format}</small>
        {peers.length>1 && <fieldset style={{border:'1px solid var(--border)',borderRadius:8}}><legend>{text.link}</legend>
          {peers.map(peer=><label key={peer.id} style={{display:'block',marginTop:5}}><input type="checkbox" checked={selectedIds.includes(Number(peer.id))} disabled={busy||Number(peer.id)===Number(meterId)} onChange={e=>setSelectedIds(old=>e.target.checked?[...new Set([...old,Number(peer.id)])]:old.filter(id=>id!==Number(peer.id)))} /> {peer.serial_number||`#${peer.id}`} ({peer.type})</label>)}
        </fieldset>}
        {error && <p role="alert" style={{color:'var(--danger, #b91c1c)'}}>{error}</p>}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button disabled={busy||!file} type="submit">{busy?text.loading:text.save}</button>
          <button disabled={busy} type="button" onClick={()=>onClose?.()}>{text.cancel}</button>
        </div>
      </form>
    </div>
  </Modal>;
}
