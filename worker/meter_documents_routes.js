// PR-10K.6C — optional meter attachments, stored in private WATER_CERTIFICATES R2.
// Important: documents NEVER block add/deactivate/replace water meter operations.
// This block is injected before CHANGE PASSWORD; all calls are admin-only.
const MVX_METER_DOC_MAX_BYTES = 20 * 1024 * 1024;
const MVX_METER_DOC_EXT_MIME = Object.freeze({
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  edoc: 'application/octet-stream', asice: 'application/vnd.etsi.asic-e+zip'
});
function mvxDocumentExtension(name) {
  const match = String(name || '').trim().toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] || '';
}
function mvxDocumentIsAllowed(name, bytes) {
  const ext = mvxDocumentExtension(name);
  if (!Object.prototype.hasOwnProperty.call(MVX_METER_DOC_EXT_MIME, ext)) return false;
  if (!bytes || bytes.length < 4) return false;
  const hex = Array.from(bytes.slice(0, 8)).map(n => n.toString(16).padStart(2, '0')).join('');
  if (ext === 'pdf') return hex.startsWith('25504446');
  if (ext === 'png') return hex.startsWith('89504e470d0a1a0a');
  if (ext === 'jpg' || ext === 'jpeg') return hex.startsWith('ffd8ff');
  if (ext === 'doc' || ext === 'xls') return hex.startsWith('d0cf11e0a1b11ae1');
  if (ext === 'docx' || ext === 'xlsx' || ext === 'edoc' || ext === 'asice') return hex.startsWith('504b0304') || hex.startsWith('504b0506');
  return false;
}
function mvxDocumentFilename(name) {
  const original = String(name || '').trim().replace(/[\x00-\x1f\x7f\\/]/g, '_');
  return original.slice(0, 180) || 'document';
}
function mvxDocumentErrorResponse(error, status, cors) {
  return new Response(JSON.stringify({error}), { status, headers: {'Content-Type':'application/json', 'Cache-Control':'no-store', ...(cors||{})} });
}

Router.register('GET', '/api/admin/water-meter-documents', async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return {error: 'forbidden'};
  const meterId = Number(ctx.url.searchParams.get('meter_id'));
  if (!Number.isSafeInteger(meterId) || meterId <= 0) return {error:'invalid_meter_id'};
  const meter = await ctx.env.DB.prepare('SELECT id FROM water_meters WHERE id=?').bind(meterId).first();
  if (!meter) return {error:'water_meter_not_found'};
  const result = await ctx.env.DB.prepare(`
    SELECT d.id, d.document_kind, d.display_title, d.original_filename,
      d.mime_type, d.size_bytes, d.uploaded_at, d.uploaded_by,
      (SELECT COUNT(*) FROM water_meter_document_links l2 WHERE l2.document_id=d.id) AS meter_links
    FROM water_meter_document_links l JOIN water_meter_documents d ON d.id=l.document_id
    WHERE l.meter_id=? AND d.delete_state='active' ORDER BY d.uploaded_at DESC, d.id DESC
  `).bind(meterId).all();
  const pending=await ctx.env.DB.prepare(`
    SELECT d.id, d.display_title, d.original_filename,
      (SELECT COUNT(*) FROM water_meter_document_links l2 WHERE l2.document_id=d.id) AS meter_links
    FROM water_meter_document_links l JOIN water_meter_documents d ON d.id=l.document_id
    WHERE l.meter_id=? AND d.delete_state='pending' ORDER BY d.delete_requested_at DESC
  `).bind(meterId).all();
  return {ok:true, documents:result.results||[], pending_deletions:pending.results||[]};
});

Router.register('POST', '/api/admin/water-meter-document', async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return {error:'forbidden'};
  if (!hasWaterCertificateStorage(ctx.env) || typeof ctx.env.WATER_CERTIFICATES.delete !== 'function') {
    return {error:'water_document_storage_unavailable'};
  }
  if (!String(ctx.request.headers.get('content-type')||'').toLowerCase().includes('multipart/form-data')) return {error:'multipart_form_data_required'};
  const form = await ctx.request.formData().catch(()=>null);
  if (!form) return {error:'invalid_form_data'};
  const file=form.get('file');
  if (!(file instanceof File) || file.size===0) return {error:'document_file_required'};
  if (file.size > MVX_METER_DOC_MAX_BYTES) return {error:'document_file_too_large'};
  const documentKind=String(form.get('document_kind')||'other').trim();
  if (!['replacement_act','other'].includes(documentKind)) return {error:'invalid_document_kind'};
  const title=String(form.get('display_title')||'').trim();
  if (title.length>120 || /[\x00-\x1f\x7f]/.test(title)) return {error:'invalid_document_title'};
  const originalName=mvxDocumentFilename(file.name);
  const fileBytes=new Uint8Array(await file.arrayBuffer());
  if (!mvxDocumentIsAllowed(originalName,fileBytes)) return {error:'invalid_document_file_type'};
  let meterIds;
  try {meterIds=JSON.parse(String(form.get('meter_ids')||'[]'));} catch {return {error:'invalid_meter_ids'};}
  if (!Array.isArray(meterIds) || meterIds.length<1 || meterIds.length>12 ||
      meterIds.some(id=>!Number.isSafeInteger(id)||id<=0) || new Set(meterIds).size!==meterIds.length) {
    return {error:'invalid_meter_ids'};
  }
  const placeholders=meterIds.map(()=>'?').join(',');
  const meters=await ctx.env.DB.prepare(`SELECT id, apartment_id FROM water_meters WHERE id IN (${placeholders})`).bind(...meterIds).all();
  const meterRows=meters?.results||[];
  if (meterRows.length!==meterIds.length) return {error:'water_meter_not_found'};
  const apartmentId=Number(meterRows[0].apartment_id);
  if (!meterRows.every(row=>Number(row.apartment_id)===apartmentId)) return {error:'cross_apartment_document_not_allowed'};
  const docId=crypto.randomUUID();
  const r2Key=`meter-documents/v1/${apartmentId}/${docId}`;
  const storedMimeType=MVX_METER_DOC_EXT_MIME[mvxDocumentExtension(originalName)];
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',fileBytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  let r2Stored=false;
  try {
    await ctx.env.WATER_CERTIFICATES.put(r2Key,fileBytes,{httpMetadata:{
      contentType:'application/octet-stream', contentDisposition:'attachment'
    }});
    r2Stored=true;
    const statements=[
      ctx.env.DB.prepare(`INSERT INTO water_meter_documents
        (id,apartment_id,document_kind,display_title,original_filename,mime_type,size_bytes,sha256,r2_key,uploaded_by)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
          docId,apartmentId,documentKind,title||null,originalName,storedMimeType,file.size,sha256,r2Key,admin.user_id),
      ...meterIds.map(id=>ctx.env.DB.prepare('INSERT INTO water_meter_document_links (document_id,meter_id) VALUES (?,?)').bind(docId,id))
    ];
    await ctx.env.DB.batch(statements);
  } catch (error) {
    if (r2Stored) {
      try {await ctx.env.WATER_CERTIFICATES.delete(r2Key);} catch (cleanupError) {
        console.error('PR-10K6C R2 orphan cleanup failed', cleanupError);
      }
    }
    console.error('PR-10K6C document upload failed',error);
    return {error:'document_upload_failed'};
  }
  await SecurityAudit.recordSafe(ctx, {actorUserId:admin.user_id,
    action:'admin.water_meter_document_upload',targetType:'water_meter_document',targetId:docId,
    details:{apartment_id:apartmentId,meter_count:meterIds.length,document_kind:documentKind,size_bytes:file.size}});
  return {ok:true, document_id:docId, meter_ids:meterIds, document_kind:documentKind};
});

Router.register('GET', '/api/admin/water-meter-document', async (ctx) => {
  const admin = await Auth.requireAdmin(ctx);
  if (!admin) return mvxDocumentErrorResponse('forbidden',403,ctx.cors);
  const id=String(ctx.url.searchParams.get('id')||'').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return mvxDocumentErrorResponse('invalid_document_id',400,ctx.cors);
  const row=await ctx.env.DB.prepare("SELECT r2_key,original_filename,mime_type FROM water_meter_documents WHERE id=? AND delete_state='active'").bind(id).first();
  if (!row) return mvxDocumentErrorResponse('document_not_found',404,ctx.cors);
  if (!hasWaterCertificateStorage(ctx.env)) return mvxDocumentErrorResponse('water_document_storage_unavailable',503,ctx.cors);
  const object=await ctx.env.WATER_CERTIFICATES.get(row.r2_key);
  if (!object) return mvxDocumentErrorResponse('document_object_not_found',404,ctx.cors);
  const filename=mvxDocumentFilename(row.original_filename);
  const asciiFilename=filename.replace(/[^a-zA-Z0-9._-]/g,'_');
  const contentDisposition=`attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`;
  const headers=new Headers({
    'Content-Type':row.mime_type||'application/octet-stream',
    'Content-Disposition':contentDisposition,
    'Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; sandbox",
    ...(ctx.cors||{})
  });
  if (object.httpEtag) headers.set('ETag',object.httpEtag);
  return new Response(object.body,{status:200,headers});
});

// PR-10K.6N.2: Admin-only unlink or delete-all. No direct bucket access by browsers.
Router.register('DELETE', '/api/admin/water-meter-document', async (ctx) => {
  const admin=await Auth.requireAdmin(ctx);
  if (!admin) return {error:'forbidden'};
  const body=await ctx.request.json().catch(()=>null);
  if (!body || typeof body!=='object' || Array.isArray(body)) return {error:'invalid_request'};
  const documentId=body.document_id;
  const meterId=body.meter_id;
  const action=body.action;
  const expected=body.expected_link_count;
  if (typeof documentId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId) ||
      !Number.isSafeInteger(meterId) || meterId<=0 ||
      !Number.isSafeInteger(expected) || expected<1 || expected>10000 ||
      !['unlink','delete_all'].includes(action)) return {error:'invalid_document_deletion_request'};
  const db=ctx.env.DB;
  const doc=await db.prepare(`SELECT d.id,d.apartment_id,d.r2_key,d.delete_state,
    (SELECT COUNT(*) FROM water_meter_document_links l2 WHERE l2.document_id=d.id) AS link_count
    FROM water_meter_documents d JOIN water_meter_document_links l ON l.document_id=d.id
    WHERE d.id=? AND l.meter_id=?`).bind(documentId,meterId).first();
  if (!doc) return {error:'document_not_found_or_not_linked'};
  const count=Number(doc.link_count);
  if (count!==expected) return {error:'document_links_changed',current_link_count:count};
  if (action==='unlink') {
    if (doc.delete_state!=='active') return {error:'document_deletion_pending'};
    if (count<=1) return {error:'last_link_requires_delete_all'};
    const e=crypto.randomUUID();
    // Single D1 transaction. Both operations require an active document with >1 links.
    const transaction=await db.batch([
      db.prepare(`INSERT INTO water_meter_document_audit_events
        (event_id,document_id,apartment_id,meter_id,actor_user_id,action,links_before,links_after)
        SELECT ?,d.id,d.apartment_id,?,?,'unlink',?,?
        FROM water_meter_documents d
        WHERE d.id=? AND d.delete_state='active' AND
          (SELECT COUNT(*) FROM water_meter_document_links WHERE document_id=d.id)=? AND
          EXISTS(SELECT 1 FROM water_meter_document_links WHERE document_id=d.id AND meter_id=?)
      `).bind(e,meterId,admin.user_id,count,count-1,documentId,count,meterId),
      db.prepare(`DELETE FROM water_meter_document_links WHERE document_id=? AND meter_id=?
        AND EXISTS(SELECT 1 FROM water_meter_documents d WHERE d.id=? AND d.delete_state='active')
        AND (SELECT COUNT(*) FROM water_meter_document_links WHERE document_id=?)=?
      `).bind(documentId,meterId,documentId,documentId,count)
    ]);
    if (Number(transaction?.[0]?.meta?.changes)!==1 || Number(transaction?.[1]?.meta?.changes)!==1)
      return {error:'document_links_changed'};
    try {await SecurityAudit.recordSafe(ctx,{actorUserId:admin.user_id,action:'admin.water_meter_document_unlink',
      targetType:'water_meter_document',targetId:documentId,details:{apartment_id:doc.apartment_id,meter_id:meterId,links_before:count}});} catch(error) {
      console.error('PR-10K6N2 security audit forwarding failed; D1 audit is durable',error);
    }
    return {ok:true,action:'unlink',remaining_links:count-1};
  }
  if (doc.delete_state==='active') {
    const result=await db.batch([
      db.prepare(`UPDATE water_meter_documents SET delete_state='pending',
        delete_requested_at=CURRENT_TIMESTAMP,delete_requested_by=?
        WHERE id=? AND delete_state='active' AND
        (SELECT COUNT(*) FROM water_meter_document_links WHERE document_id=?)=?
      `).bind(admin.user_id,documentId,documentId,count),
      db.prepare(`INSERT INTO water_meter_document_audit_events
        (event_id,document_id,apartment_id,meter_id,actor_user_id,action,links_before,links_after)
        SELECT ?,d.id,d.apartment_id,?,?,'delete_requested',?,0
        FROM water_meter_documents d WHERE d.id=? AND d.delete_state='pending'
      `).bind(crypto.randomUUID(),meterId,admin.user_id,count,documentId)
    ]);
    if (Number(result?.[0]?.meta?.changes)!==1 || Number(result?.[1]?.meta?.changes)!==1)
      return {error:'document_links_changed'};
  } else if (doc.delete_state!=='pending') {
    return {error:'invalid_document_delete_state'};
  }
  // R2 deletion happens AFTER D1 access is revoked. Failures remain retryable with pending metadata.
  if (!hasWaterCertificateStorage(ctx.env) || typeof ctx.env.WATER_CERTIFICATES.delete!=='function')
    return {error:'water_document_storage_unavailable',cleanup:'pending'};
  try {
    await ctx.env.WATER_CERTIFICATES.delete(doc.r2_key);
  } catch(error) {
    console.error('PR-10K6N2 R2 cleanup pending',error);
    return {error:'document_cleanup_pending',cleanup:'pending'};
  }
  try {
    const finalized=await db.batch([
      db.prepare(`DELETE FROM water_meter_document_links WHERE document_id=?`).bind(documentId),
      db.prepare(`DELETE FROM water_meter_documents WHERE id=? AND delete_state='pending'`).bind(documentId),
      db.prepare(`INSERT INTO water_meter_document_audit_events
        (event_id,document_id,apartment_id,meter_id,actor_user_id,action,links_before,links_after)
        VALUES (?,?,?,?,?,'delete_completed',?,0)
      `).bind(crypto.randomUUID(),documentId,doc.apartment_id,meterId,admin.user_id,count)
    ]);
    if (Number(finalized?.[1]?.meta?.changes)!==1)
      return {error:'document_cleanup_pending',cleanup:'pending'};
  } catch(error) {
    console.error('PR-10K6N2 D1 cleanup pending',error);
    return {error:'document_cleanup_pending',cleanup:'pending'};
  }
  try {await SecurityAudit.recordSafe(ctx,{actorUserId:admin.user_id,action:'admin.water_meter_document_delete_all',
    targetType:'water_meter_document',targetId:documentId,details:{apartment_id:doc.apartment_id,meter_id:meterId,links_before:count}});} catch(error) {
    console.error('PR-10K6N2 security audit forwarding failed; D1 audit is durable',error);
  }
  return {ok:true,action:'delete_all',removed_links:count};
});

