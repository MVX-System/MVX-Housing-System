// PR-10K.6J — optional documents during water-meter registration.
// The meter is always created first. An attachment failure MUST NOT retry creation.
export const METER_DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.edoc,.asice';
export const METER_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(METER_DOCUMENT_ACCEPT.slice(1).split(',.'));

export function planNewMeterDocuments({ replacementActFile = null, otherDocumentFiles = [], relatedActMeterIds = [], meterId }) {
  if (!Number.isSafeInteger(Number(meterId)) || Number(meterId) <= 0) {
    throw new Error('invalid_new_meter_id');
  }
  const id = Number(meterId);
  const peers = [...new Set(relatedActMeterIds.map(Number))].filter(peer =>
    Number.isSafeInteger(peer) && peer > 0 && peer !== id);
  const docs = [];
  if (replacementActFile) docs.push({ file: replacementActFile, kind: 'replacement_act', meterIds: [id, ...peers] });
  for (const file of otherDocumentFiles) docs.push({ file, kind: 'other', meterIds: [id] });
  return docs;
}

function fileIssue(file, linkedMeters) {
  if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size)) return 'invalid_file';
  const ext = file.name.toLowerCase().trim().split('.').pop();
  if (!ALLOWED_EXTENSIONS.has(ext)) return 'unsupported_extension';
  if (file.size <= 0 || file.size > METER_DOCUMENT_MAX_BYTES) return 'invalid_file_size';
  if (linkedMeters.length > 12) return 'too_many_linked_meters';
  return null;
}

export async function uploadOptionalMeterDocuments({ meterId, replacementActFile = null,
  otherDocumentFiles = [], relatedActMeterIds = [], send }) {
  const queue = planNewMeterDocuments({ meterId, replacementActFile, otherDocumentFiles, relatedActMeterIds });
  if (!queue.length) return { uploaded: 0, failed: [], attempted: 0 };
  const failed = [];
  let uploaded = 0;
  for (const item of queue) {
    const issue = fileIssue(item.file, item.meterIds);
    if (issue) {
      failed.push({ fileName: item.file?.name || '', issue });
      continue;
    }
    try {
      const form = new FormData();
      form.append('file', item.file);
      form.append('document_kind', item.kind);
      form.append('display_title', '');
      form.append('meter_ids', JSON.stringify(item.meterIds));
      const result = await send('/api/admin/water-meter-document', { method: 'POST', body: form });
      if (!result?.ok) throw new Error(result?.error || 'upload_failed');
      uploaded += 1;
    } catch (err) {
      failed.push({ fileName: item.file.name, issue: 'upload_failed' });
    }
  }
  return { uploaded, failed, attempted: queue.length };
}
