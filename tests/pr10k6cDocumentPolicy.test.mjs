import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const code=fs.readFileSync(path.join(root,'worker/meter_documents_routes.js'),'utf8');
const routes=[];
const context={ Router:{register:(method,url,fn)=>routes.push({method,url,fn})}, Auth:{requireAdmin:async()=>({user_id:10})},
  File:globalThis.File, crypto:globalThis.crypto, Response,Headers, console, Set, Number, Object, String, Array,
  Uint8Array, encodeURIComponent };
vm.runInNewContext(code,context,{filename:'meter_documents_routes.js'});
const evalCode=x=>vm.runInNewContext(x,context);
const magic=(hex)=>Uint8Array.from(hex.match(/../g).map(x=>parseInt(x,16)));

test('three admin-only routes do not replace existing calibration endpoints',()=>{
 assert.deepEqual(routes.map(r=>r.url),['/api/admin/water-meter-documents','/api/admin/water-meter-document','/api/admin/water-meter-document','/api/admin/water-meter-document']);
 assert.deepEqual(routes.map(r=>r.method),['GET','POST','GET','DELETE']);
 assert.ok(!code.includes('certificate_file_required'));
});
test('replacement act optional and no meter save/deactivate route touched',()=>{
 assert.ok(!code.includes('replacement_act_required'));
 assert.ok(!code.includes('register(\'POST\', \'/api/admin/deactivate-water-meter'));
 assert.ok(!code.includes('/api/admin/add-water-meter'));
});
test('PDF signature accepted; PDF masquerading as JPEG rejected',()=>{
 assert.equal(evalCode('mvxDocumentIsAllowed')( 'act.pdf',magic('255044462d312e34')),true);
 assert.equal(evalCode('mvxDocumentIsAllowed')( 'act.jpg',magic('255044462d312e34')),false);
});
test('PNG JPEG signatures accepted, arbitrary js rejected',()=>{
 const f=evalCode('mvxDocumentIsAllowed');
 assert.equal(f('photo.png',magic('89504e470d0a1a0a')),true);
 assert.equal(f('photo.jpg',magic('ffd8ffe100000000')),true);
 assert.equal(f('evil.js',magic('255044462d312e34')),false);
});
test('legacy office signatures accepted only for doc/xls',()=>{
 const f=evalCode('mvxDocumentIsAllowed');const bytes=magic('d0cf11e0a1b11ae1');
 assert.equal(f('file.doc',bytes),true);assert.equal(f('file.xls',bytes),true);assert.equal(f('file.xlsx',bytes),false);
});
test('OOXML ZIP signatures accepted only for allowed extensions',()=>{
 const f=evalCode('mvxDocumentIsAllowed');const bytes=magic('504b030414000600');
 assert.equal(f('sheet.xlsx',bytes),true);assert.equal(f('doc.docx',bytes),true);assert.equal(f('code.html',bytes),false);
});
test('filenames cannot contain slashes or control characters',()=>{
 const f=evalCode('mvxDocumentFilename');
 assert.equal(f('../act.pdf'),'.._act.pdf');assert.equal(f('line\nact.pdf'),'line_act.pdf');
});
test('R2 keys are randomized; code never uses filename as a key suffix',()=>{
 assert.match(code,/crypto\.randomUUID\(\)/);assert.match(code,/meter-documents\/v1/);
 assert.doesNotMatch(code,/r2Key=.*originalName/);
});
test('role required in each endpoint',()=>{
 assert.equal((code.match(/await Auth\.requireAdmin\(ctx\)/g)||[]).length,4);
});
test('20 MiB file size enforced server-side',()=>{
 assert.equal(evalCode('MVX_METER_DOC_MAX_BYTES'),20*1024*1024);
 assert.match(code,/file\.size > MVX_METER_DOC_MAX_BYTES/);
});
test('DB insert and document links use D1.batch; R2 cleanup on failure',()=>{
 assert.match(code,/await ctx\.env\.DB\.batch\(statements\)/);
 assert.match(code,/WATER_CERTIFICATES\.delete\(r2Key\)/);
});
