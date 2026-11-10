import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { createPortal } from 'react-dom';
import MeterDocumentWindow from './MeterDocumentWindow';
import { api, apiFile } from '../services/api';
import { meterDocumentPreviewFormat, meterDocumentPreviewSignatureMatches } from '../utils/meterDocumentPreview.mjs';

const I18N = {
  ru: {title:'Документы счётчика', upload:'Добавить документ', act:'Акт замены счётчика',
    other:'Прочий документ', recommended:'Акт замены желателен, но не обязателен. Его можно добавить позже.',
    noDocs:'Документы пока не прикреплены.', name:'Описание (необязательно)', file:'Файл',
    link:'Связать с другими счётчиками той же квартиры', save:'Загрузить', cancel:'Закрыть',
    none:'Выберите файл', format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; до 20 МБ на файл',
    uploadError:'Не удалось загрузить документ', loadError:'Не удалось получить список документов',
    downloadError:'Не удалось открыть документ', loading:'Загрузка…', uploaded:'Документ загружен',
    required:'Выберите файл.', size:'Файл превышает 20 МБ.', view:'Просмотр', download:'Скачать',
    closePreview:'Закрыть просмотр', previewLoading:'Открываем документ…',
    previewError:'Не удалось показать документ', previewUnsupported:'Предпросмотр этого формата в браузере недоступен. Для открытия используйте «Скачать».',
    previewCorrupt:'Формат файла не соответствует документу.', popupBlocked:'Браузер заблокировал отдельное окно просмотра. Разрешите всплывающие окна для MVX и повторите нажатие «Просмотр».', meters:'Счётчиков в акте',delete:'Удалить', unlink:'Отвязать только от этого счётчика', deleteAll:'Удалить из всех счётчиков', deletionQuestion:'Что сделать с документом?', deletionWarning:'Полное удаление затронет все связанные счётчики и удалит файл из хранилища.', confirmDelete:'Подтвердить действие', cancelDelete:'Отмена', deletionBusy:'Удаляем…', deletionError:'Не удалось изменить привязку документа', deletionPending:'Документ скрыт. Очистка файла ожидает повторной попытки.', retryDelete:'Повторить очистку файла', retryPending:'Повтор очистки…'},
  en: {title:'Meter documents', upload:'Add document', act:'Replacement act',other:'Other attachment',
    recommended:'A replacement act is recommended, not required. You can attach it later.',
    noDocs:'No documents attached yet.',name:'Description (optional)',file:'File',
    link:'Link to other meters in the same apartment',save:'Upload',cancel:'Close',
    none:'Select a file',format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; up to 20 MB per file',
    uploadError:'Document upload failed',loadError:'Cannot load documents',downloadError:'Cannot open document',
    loading:'Loading…',uploaded:'Document uploaded',required:'Select a file.',size:'File exceeds 20 MB.',
    view:'Preview',download:'Download',closePreview:'Close preview',previewLoading:'Opening preview…',
    previewError:'Could not preview document',previewUnsupported:'Browser preview is not available for this format. Use Download to open it in an appropriate app.',
    previewCorrupt:'File signature does not match document format.',popupBlocked:'The browser blocked the separate reader window. Allow pop-ups for MVX and click Preview again.',meters:'Linked meters',delete:'Delete', unlink:'Unlink only from this meter', deleteAll:'Delete from all meters', deletionQuestion:'What should happen to this document?', deletionWarning:'Full deletion affects every linked meter and removes the stored file.', confirmDelete:'Confirm action', cancelDelete:'Cancel', deletionBusy:'Deleting…', deletionError:'Could not change document links', deletionPending:'Document hidden. File cleanup requires retry.', retryDelete:'Retry file cleanup', retryPending:'Retrying…'},
  lv: {title:'Skaitītāja dokumenti',upload:'Pievienot dokumentu',act:'Skaitītāja nomaiņas akts',other:'Cits pielikums',
    recommended:'Nomaiņas akts ir vēlams, bet nav obligāts. To var pievienot vēlāk.',
    noDocs:'Dokumenti vēl nav pievienoti.',name:'Apraksts (nav obligāts)',file:'Fails',
    link:'Piesaistīt citiem tā paša dzīvokļa skaitītājiem',save:'Augšupielādēt',cancel:'Aizvērt',
    none:'Izvēlieties failu',format:'PDF, PNG, JPG, DOC, DOCX, XLS, XLSX, eDoc, ASiC-E; līdz 20 MB katram failam',
    uploadError:'Neizdevās augšupielādēt dokumentu',loadError:'Neizdevās ielādēt dokumentus',
    downloadError:'Neizdevās atvērt dokumentu',loading:'Ielāde…',uploaded:'Dokuments pievienots',
    required:'Izvēlieties failu.',size:'Fails ir lielāks par 20 MB.',view:'Skatīt',download:'Lejupielādēt',
    closePreview:'Aizvērt priekšskatījumu',previewLoading:'Atver dokumentu…',
    previewError:'Neizdevās apskatīt dokumentu',previewUnsupported:'Šī formāta priekšskatījums pārlūkā nav pieejams. Lai atvērtu failu, izmantojiet Lejupielādēt.',
    previewCorrupt:'Faila saturs neatbilst deklarētajam formātam.',popupBlocked:'Pārlūkprogramma bloķēja atsevišķo dokumenta logu. Atļaujiet MVX uznirstošos logus un mēģiniet vēlreiz.',meters:'Saistītie skaitītāji',delete:'Dzēst', unlink:'Atsaistīt tikai no šī skaitītāja', deleteAll:'Dzēst no visiem skaitītājiem', deletionQuestion:'Ko darīt ar dokumentu?', deletionWarning:'Pilnīga dzēšana ietekmēs visus saistītos skaitītājus un dzēsīs failu glabātuvē.', confirmDelete:'Apstiprināt darbību', cancelDelete:'Atcelt', deletionBusy:'Dzēš…', deletionError:'Neizdevās mainīt dokumenta piesaisti', deletionPending:'Dokuments paslēpts. Faila dzēšana jāatkārto.', retryDelete:'Atkārtot faila dzēšanu', retryPending:'Atkārto…'}
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
  const [deletingDoc,setDeletingDoc]=useState(null);
  const [deleteMode,setDeleteMode]=useState('unlink');
  const [pendingDeletions,setPendingDeletions]=useState([]);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [preview,setPreview]=useState(null);
  const [previewBusyId,setPreviewBusyId]=useState(null);
  const [viewerWindow,setViewerWindow]=useState(null);
  const viewerRef=useRef(null);
  const previewUrl=useRef(null);
  const previewRequest=useRef(0);
  const meterId=meter?.id;
  const peers=useMemo(()=>metersInApartment.filter(m=>Number(m.apartment_id)===Number(meter?.apartment_id)),[metersInApartment,meter?.apartment_id]);
  useEffect(()=>{
    // Cancel any outstanding preview on meter change and discard its private blob URL.
    previewRequest.current += 1;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current=null;setPreview(null);setPreviewBusyId(null);
    const previous=viewerRef.current;viewerRef.current=null;setViewerWindow(null);
    if (previous && !previous.closed) previous.close();
    if (!meterId) {setRows([]);setPendingDeletions([]);setDeletingDoc(null);setSelectedIds([]);setFile(null);setError('');return;}
    let cancelled=false;
    setSelectedIds([Number(meterId)]);
    setFile(null);setTitle('');setKind('replacement_act');setLoading(true);setError('');setDeletingDoc(null);setPendingDeletions([]);
    api(`/api/admin/water-meter-documents?meter_id=${Number(meterId)}`)
      .then(data=>{if (!cancelled){if (data?.error) throw Error(data.error);setRows(data?.documents||[]);setPendingDeletions(data?.pending_deletions||[]);}})
      .catch(err=>{if (!cancelled)setError(`${text.loadError}: ${err.message}`);})
      .finally(()=>{if (!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[meterId]);
  useEffect(()=>()=>{
    // Closing the parent modal/logging out also closes the private reader and revokes its blob URL.
    previewRequest.current += 1;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current=null;
    const child=viewerRef.current;viewerRef.current=null;
    if (child && !child.closed) child.close();
  },[]);
  useEffect(()=>{
    if (!viewerWindow) return undefined;
    const onClosed=()=>{
      if (viewerRef.current!==viewerWindow) return;
      previewRequest.current += 1;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current=null;viewerRef.current=null;
      setViewerWindow(null);setPreview(null);setPreviewBusyId(null);
    };
    viewerWindow.addEventListener('pagehide',onClosed);
    return ()=>viewerWindow.removeEventListener('pagehide',onClosed);
  },[viewerWindow]);
  function closePreview() {
    previewRequest.current += 1;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current=null;setPreview(null);setPreviewBusyId(null);
    const child=viewerRef.current;viewerRef.current=null;setViewerWindow(null);
    if (child && !child.closed) child.close();
  }
  async function openPreview(doc) {
    const format=meterDocumentPreviewFormat(doc);
    if (!format) {setError(text.previewUnsupported);return;}
    // Must be opened synchronously from the click event: Safari/iPhone blocks tabs created after await.
    closePreview();
    const child=window.open('', '_blank');
    if (!child) {setError(text.popupBlocked);return;}
    try {
      child.opener=null; // No reverse access to the main MVX window from the reader.
      child.document.title=doc.display_title||doc.original_filename||'MVX Document';
      const viewport=child.document.createElement('meta');
      viewport.setAttribute('name','viewport');viewport.setAttribute('content','width=device-width, initial-scale=1');
      child.document.head.appendChild(viewport);
    } catch {
      child.close();setError(text.previewError);return;
    }
    viewerRef.current=child;
    setViewerWindow(child);
    setPreview({title:doc.display_title||doc.original_filename,type:format.type});
    const request=++previewRequest.current;
    setPreviewBusyId(doc.id);setError('');
    try {
      const response=await apiFile(`/api/admin/water-meter-document?id=${encodeURIComponent(doc.id)}`);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const fileBlob=await response.blob();
      const header=new Uint8Array(await fileBlob.slice(0,8).arrayBuffer());
      if (!meterDocumentPreviewSignatureMatches(header,format.mime)) throw Error(text.previewCorrupt);
      if (request!==previewRequest.current || child.closed) return;
      // Never expose private R2 URLs, access tokens, or document bytes to third-party viewers.
      const url=URL.createObjectURL(new Blob([fileBlob],{type:format.mime}));
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current=url;
      setPreview({url,type:format.type,title:doc.display_title||doc.original_filename});
    } catch (err) {
      if (request===previewRequest.current) {
        setPreview({type:format.type,title:doc.display_title||doc.original_filename,error:err.message});
        setError(`${text.previewError}: ${err.message}`);
      }
    } finally {
      if (request===previewRequest.current) setPreviewBusyId(null);
    }
  }
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
      setRows(refreshed.documents||[]);setPendingDeletions(refreshed.pending_deletions||[]);setFile(null);setTitle('');
      setSelectedIds([Number(meterId)]);
    } catch (err) {setError(`${text.uploadError}: ${err.message}`);} finally {setBusy(false);}
  }
  function startDeletion(doc) {
    closePreview();
    setDeletingDoc(doc);
    setDeleteMode(Number(doc.meter_links)>1?'unlink':'delete_all');
    setError('');
  }
  async function refreshDocuments() {
    const refreshed=await api(`/api/admin/water-meter-documents?meter_id=${Number(meterId)}`);
    if (!refreshed?.ok) throw Error(refreshed?.error||text.loadError);
    setRows(refreshed.documents||[]);
    setPendingDeletions(refreshed.pending_deletions||[]);
  }
  async function submitDeletion(doc, action) {
    if (!doc || deleteBusy) return;
    setDeleteBusy(true);setError('');
    try {
      const result=await api('/api/admin/water-meter-document',{
        method:'DELETE',body:JSON.stringify({
          document_id:doc.id,meter_id:Number(meterId),
          action,expected_link_count:Number(doc.meter_links)
        })
      });
      if (!result?.ok) {
        if (result?.cleanup==='pending') {
          await refreshDocuments();setDeletingDoc(null);
          setError(text.deletionPending);return;
        }
        throw Error(result?.error||text.deletionError);
      }
      await refreshDocuments();setDeletingDoc(null);
    } catch(err) {
      // Refresh after conflicts; link counts may have changed in another admin session.
      try {await refreshDocuments();} catch { /* Preserve the original mutation error. */ }
      setError(`${text.deletionError}: ${err.message}`);
    } finally {setDeleteBusy(false);}
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
  return <>{viewerWindow && !viewerWindow.closed && createPortal(
    <MeterDocumentWindow win={viewerWindow} preview={preview} language={language} onClose={closePreview} />,
    viewerWindow.document.body
  )}<Modal open={Boolean(meter)} title={`${text.title} · ${meter?.serial_number||''}`} onClose={()=>{if(!busy&&!deleteBusy) onClose?.();}}>
    <div style={{display:'grid',gap:14,maxWidth:680}}>
      <p style={{fontSize:13,color:'var(--text)',margin:0}}>{text.recommended}</p>
      {loading ? <p>{text.loading}</p> : rows.length ?
        <ul style={{paddingLeft:18,margin:0,display:'grid',gap:8}}>
          {rows.map(doc=><li key={doc.id}>
            <strong style={{fontSize:13}}>{doc.display_title||doc.original_filename}</strong>
            <span style={{fontSize:12,color:'var(--text)',marginLeft:8}}>{doc.document_kind==='replacement_act'?text.act:text.other} · {doc.meter_links} {text.meters}</span>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:4}}>
              {meterDocumentPreviewFormat(doc) && <button type="button" disabled={previewBusyId!==null||deleteBusy} onClick={()=>openPreview(doc)}>{previewBusyId===doc.id?text.previewLoading:text.view}</button>}
              <button type="button" disabled={previewBusyId!==null||deleteBusy} onClick={()=>download(doc)}>{text.download}</button>
              <button type="button" disabled={busy||deleteBusy||previewBusyId!==null} onClick={()=>startDeletion(doc)}>{text.delete}</button>
              {!meterDocumentPreviewFormat(doc) && <small style={{alignSelf:'center'}}>{text.previewUnsupported}</small>}
            </div>
            {deletingDoc?.id===doc.id && <fieldset style={{marginTop:8,padding:10,border:'1px solid var(--border)',borderRadius:8}} disabled={deleteBusy}>
              <legend>{text.deletionQuestion}</legend>
              {Number(doc.meter_links)>1 && <label style={{display:'block',marginBottom:8}}>
                <input type="radio" name={`document-delete-${doc.id}`} value="unlink" checked={deleteMode==='unlink'} onChange={()=>setDeleteMode('unlink')}/> {text.unlink}
              </label>}
              <label style={{display:'block',marginBottom:8}}>
                <input type="radio" name={`document-delete-${doc.id}`} value="delete_all" checked={deleteMode==='delete_all'} onChange={()=>setDeleteMode('delete_all')}/> {text.deleteAll}
              </label>
              {deleteMode==='delete_all' && <p style={{fontSize:13,color:'var(--danger,#b91c1c)'}}>{text.deletionWarning}</p>}
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button type="button" onClick={()=>submitDeletion(doc,deleteMode)}>{deleteBusy?text.deletionBusy:text.confirmDelete}</button>
                <button type="button" onClick={()=>setDeletingDoc(null)}>{text.cancelDelete}</button>
              </div>
            </fieldset>}
          </li>)}
        </ul> : <p style={{fontSize:13,margin:0}}>{text.noDocs}</p>}
      {pendingDeletions.length>0 && <section aria-label={text.deletionPending} style={{border:'1px solid var(--border)',borderRadius:8,padding:10}}>
        <p role="status" style={{fontSize:13}}>{text.deletionPending}</p>
        {pendingDeletions.map(doc=><div key={doc.id} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
          <span>{doc.display_title||doc.original_filename}</span>
          <button type="button" disabled={busy||deleteBusy} onClick={()=>submitDeletion(doc,'delete_all')}>
            {deleteBusy?text.retryPending:text.retryDelete}
          </button>
        </div>)}
      </section>}
      <form onSubmit={upload} style={{display:'grid',gap:10}}>
        <strong>{text.upload}</strong>
        <select value={kind} onChange={e=>setKind(e.target.value)} disabled={busy||deleteBusy}>
          <option value="replacement_act">{text.act}</option><option value="other">{text.other}</option>
        </select>
        <label>{text.name}<input style={{display:'block',width:'100%'}} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} disabled={busy||deleteBusy}/></label>
        <label>{text.file}<input name="file" type="file" accept={ALLOWED} onChange={e=>setFile(e.target.files?.[0]||null)} disabled={busy||deleteBusy}/></label>
        <small>{text.format}</small>
        {peers.length>1 && <fieldset style={{border:'1px solid var(--border)',borderRadius:8}}><legend>{text.link}</legend>
          {peers.map(peer=><label key={peer.id} style={{display:'block',marginTop:5}}><input type="checkbox" checked={selectedIds.includes(Number(peer.id))} disabled={busy||Number(peer.id)===Number(meterId)} onChange={e=>setSelectedIds(old=>e.target.checked?[...new Set([...old,Number(peer.id)])]:old.filter(id=>id!==Number(peer.id)))} /> {peer.serial_number||`#${peer.id}`} ({peer.type})</label>)}
        </fieldset>}
        {error && <p role="alert" style={{color:'var(--danger, #b91c1c)'}}>{error}</p>}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button disabled={busy||deleteBusy||!file} type="submit">{busy?text.loading:text.save}</button>
          <button disabled={busy||deleteBusy} type="button" onClick={()=>onClose?.()}>{text.cancel}</button>
        </div>
      </form>
    </div>
  </Modal></>;
}
