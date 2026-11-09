// PR-10K.6M.1 — private, authenticated, in-memory meter-document preview policy.
// Never use third-party viewers or persistent/public URLs.
const FORMATS = Object.freeze({
  pdf: {mime: 'application/pdf', type: 'pdf'},
  png: {mime: 'image/png', type: 'image'},
  jpg: {mime: 'image/jpeg', type: 'image'},
  jpeg: {mime: 'image/jpeg', type: 'image'}
});

export function meterDocumentPreviewFormat(documentRow) {
  const filename = String(documentRow?.original_filename || '').trim().toLowerCase();
  const extension = /\.([a-z0-9]+)$/.exec(filename)?.[1];
  const expected = FORMATS[extension];
  if (!expected) return null;
  const declared = String(documentRow?.mime_type || '').trim().toLowerCase();
  if (declared !== expected.mime) return null;
  return { type: expected.type, mime: expected.mime };
}

export function meterDocumentPreviewSignatureMatches(bytes, type) {
  if (!(bytes instanceof Uint8Array)) return false;
  const matches=(arr)=>arr.every((b,i)=>bytes[i]===b);
  if (type==='application/pdf') return bytes.length>=5 && matches([0x25,0x50,0x44,0x46,0x2d]);
  if (type==='image/png') return bytes.length>=8 && matches([137,80,78,71,13,10,26,10]);
  if (type==='image/jpeg') return bytes.length>=3 && matches([255,216,255]);
  return false;
}
