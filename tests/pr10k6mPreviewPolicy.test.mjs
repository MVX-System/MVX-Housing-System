import test from 'node:test';
import assert from 'node:assert/strict';
import {meterDocumentPreviewFormat, meterDocumentPreviewSignatureMatches} from '../src/utils/meterDocumentPreview.mjs';
const doc=(filename,mime)=>({original_filename:filename,mime_type:mime});
test('PDF is previewable when name and MIME agree',()=>assert.deepEqual(meterDocumentPreviewFormat(doc('act.PDF','application/pdf')),{type:'pdf',mime:'application/pdf'}));
test('PNG is previewable',()=>assert.deepEqual(meterDocumentPreviewFormat(doc('photo.png','image/png')),{type:'image',mime:'image/png'}));
test('JPEG and JPG are previewable',()=>{
 for(const ext of ['jpg','jpeg']) assert.deepEqual(meterDocumentPreviewFormat(doc('pic.'+ext,'image/jpeg')),{type:'image',mime:'image/jpeg'});
});
test('Office and signed containers never rendered as executable web content',()=>{
 for(const [extension,mime] of [['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],['asice','application/vnd.etsi.asic-e+zip'],['edoc','application/octet-stream'],['doc','application/msword'],['xls','application/vnd.ms-excel']])
  assert.equal(meterDocumentPreviewFormat(doc('f.'+extension,mime)),null);
});
test('Mismatched extension and MIME are denied',()=>{
 for (const row of [doc('file.pdf','text/html'),doc('file.png','application/pdf'),doc('file.jpg','image/png'),doc('script.html','application/pdf'), doc('file.pdf','')])
  assert.equal(meterDocumentPreviewFormat(row),null);
});
test('PDF magic signature required',()=>{
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([37,80,68,70,45,0]),'application/pdf'),true);
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([60,104,116,109,108]),'application/pdf'),false);
});
test('PNG signature required',()=>{
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([137,80,78,71,13,10,26,10]),'image/png'),true);
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([137,80,78,71]),'image/png'),false);
});
test('JPEG signature required',()=>{
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([255,216,255,1,2]),'image/jpeg'),true);
 assert.equal(meterDocumentPreviewSignatureMatches(Uint8Array.from([255,216,0]),'image/jpeg'),false);
});
test('Unknown types and malformed bytes denied',()=>{
 assert.equal(meterDocumentPreviewSignatureMatches(new Uint8Array([37,80,68,70,45]),'text/html'),false);
 assert.equal(meterDocumentPreviewSignatureMatches(null,'application/pdf'),false);
});
