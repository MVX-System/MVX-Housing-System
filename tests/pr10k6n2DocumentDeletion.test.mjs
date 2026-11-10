import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const worker=fs.readFileSync(path.join(ROOT,'worker/meter_documents_routes.js'),'utf8');
const ui=fs.readFileSync(path.join(ROOT,'src/components/MeterDocumentsModal.jsx'),'utf8');
const migration=fs.readFileSync(path.join(ROOT,'migrations/pr-10k-6n2-water-meter-document-deletion.sql'),'utf8');
const uuid='8dc13d9e-abd4-49ba-922e-01c8d8fcc369';
const meterA=101, meterB=102;
function simulation({count=2,failR2=false,admin=true}={}) {
  const routes=[];
  const store={doc:{id:uuid,apartment_id:8,r2_key:'meter-documents/v1/8/'+uuid,delete_state:'active'},
    links:count===2?[101,102]:[101], audit:[], r2Deleted:0, failR2, securityEvents:[]};
  const DB={prepare(sql){return {bind(...args){return {
    async first(){
      if (sql.includes('FROM water_meter_documents d JOIN water_meter_document_links l')) {
        if(!store.doc||!store.links.includes(args[1])||args[0]!==uuid)return null;
        return {...store.doc,link_count:store.links.length};
      }
      if(sql.includes('SELECT id FROM water_meters'))return {id:args[0]};
      if(sql.includes('SELECT r2_key,original_filename,mime_type FROM water_meter_documents')){
        return store.doc?.delete_state==='active'?{r2_key:store.doc.r2_key, original_filename:'example.pdf',mime_type:'application/pdf'}:null;
      }
      throw Error('UNEXPECTED FIRST: '+sql);
    },
    async all(){
      if(sql.includes('JOIN water_meter_documents d ON d.id=l.document_id')){
        const isPending=sql.includes("d.delete_state='pending'");
        if (!store.doc||!store.links.includes(args[0]))return {results:[]};
        return {results:store.doc.delete_state===(isPending?'pending':'active')?[{id:uuid,meter_links:store.links.length,original_filename:'example.pdf'}]:[]};
      }
      throw Error('UNEXPECTED ALL: '+sql);
    }, _sql:sql,_args:args};}};},
    async batch(operations){
      const out=[];
      for(const op of operations){
        const sql=op._sql, args=op._args;
        let changes=0;
        if(sql.includes('INSERT INTO water_meter_document_audit_events')) {
          if(sql.includes("'unlink'")){
            if(store.doc?.delete_state==='active'&&store.links.length===args.at(-2)&&store.links.includes(args.at(-1))) {
              store.audit.push('unlink');changes=1;
            }
          } else if(sql.includes("'delete_requested'")){
            if(store.doc?.delete_state==='pending') {store.audit.push('delete_requested');changes=1;}
          } else if(sql.includes("'delete_completed'")) {store.audit.push('delete_completed');changes=1;}
          else throw Error('unknown audit SQL');
        } else if(sql.includes('DELETE FROM water_meter_document_links')){
          if(sql.includes('AND meter_id=?')) {
            if(store.doc?.delete_state==='active'&&store.links.length===args.at(-1)){
              const before=store.links.length;store.links=store.links.filter(x=>x!==args[1]);changes=before-store.links.length;
            }
          } else if (store.doc) {changes=store.links.length;store.links=[];}
        } else if(sql.includes('UPDATE water_meter_documents SET delete_state')) {
          if(store.doc?.delete_state==='active'&&store.links.length===args.at(-1)) {
            store.doc.delete_state='pending';changes=1;
          }
        } else if(sql.includes('DELETE FROM water_meter_documents')) {
          if(store.doc?.delete_state==='pending') {store.doc=null;changes=1;}
        } else throw Error('UNEXPECTED BATCH SQL: '+sql);
        out.push({meta:{changes}});
      }
      return out;
    }};
  const context={Router:{register:(method,url,fn)=>routes.push({method,url,fn})},
    Auth:{requireAdmin:async()=>admin?{user_id:33}:null},
    SecurityAudit:{recordSafe:async(_ctx,entry)=>{store.securityEvents.push(entry.action);}},
    hasWaterCertificateStorage:()=>true,File,crypto:webcrypto,Response,Headers,console,Set,
    Uint8Array,encodeURIComponent,Number,Object,String,Array};
  vm.runInNewContext(worker,context,{filename:'worker/meter_documents_routes.js'});
  const invoke=async(method,url,body,query='')=>{
    const route=routes.find(x=>x.method===method&&x.url===url);
    assert.ok(route,'Missing route '+method+' '+url);
    const req={headers:new Headers(),json:async()=>body};
    return route.fn({request:req,url:new URL('https://local'+url+query),cors:{},env:{DB,
      WATER_CERTIFICATES:{delete:async key=>{assert.equal(key,'meter-documents/v1/8/'+uuid);store.r2Deleted++;if(store.failR2)throw Error('temporary R2 failure');},
        get:async key=>({httpEtag:'etag',body:new Uint8Array([37,80,68,70])})}}});
  };
  return {invoke,store,routes};
}
const deleteReq=(action,expected=2,meter_id=meterA)=>({document_id:uuid,meter_id,action,expected_link_count:expected});
test('route contract: existing GET/POST unchanged; DELETE is admin-gated',()=>{
  const x=simulation();
  assert.deepEqual(x.routes.map(r=>[r.method,r.url]),[
    ['GET','/api/admin/water-meter-documents'],['POST','/api/admin/water-meter-document'],
    ['GET','/api/admin/water-meter-document'],['DELETE','/api/admin/water-meter-document']]);
  assert.equal((worker.match(/await Auth.requireAdmin\(ctx\)/g)||[]).length,4);
});
test('migration is additive: audit + pending cleanup, not direct R2 orphaning',()=>{
  assert.match(migration,/ALTER TABLE water_meter_documents/);
  assert.match(migration,/delete_state/);
  assert.match(migration,/water_meter_document_audit_events/);
  assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM/);
  assert.ok(worker.indexOf("delete_state='pending'")<worker.indexOf('WATER_CERTIFICATES.delete(doc.r2_key)'));
  assert.match(worker,/WHERE id=\? AND delete_state='active'/);
});
test('UI has three locales and separate unlink vs delete-all confirmation',()=>{
  for(const word of ["unlink:'Отвязать", "unlink:'Unlink only", "unlink:'Atsaistīt", 'deleteAll:', 'confirmDelete:', 'retryDelete:', "action,expected_link_count:Number(doc.meter_links)"])
    assert.ok(ui.includes(word),word);
  assert.match(ui,/Number\(doc\.meter_links\)>1\?'unlink':'delete_all'/);
  assert.match(ui,/setPendingDeletions\(refreshed\.pending_deletions\|\|\[\]\)/);
  assert.doesNotMatch(ui,/WATER_CERTIFICATES|r2_key|r2Key/);
});
test('admin permission denied before access to document',async()=>{
  const t=simulation({admin:false});
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all'));
  assert.equal(x.error,'forbidden'); assert.equal(t.store.r2Deleted,0);
});
test('malformed identifier or action denied without data modification',async()=>{
  const t=simulation();
  for(const body of [{...deleteReq('delete_all'),document_id:'bad'},deleteReq('replace'),{...deleteReq('unlink'),meter_id:'101'},{...deleteReq('unlink'),expected_link_count:0}]){
    const x=await t.invoke('DELETE','/api/admin/water-meter-document',body);
    assert.equal(x.error,'invalid_document_deletion_request');
  }
  assert.equal(t.store.r2Deleted,0);assert.equal(t.store.audit.length,0);
});
test('unrelated meter cannot unlink or delete document',async()=>{
  const t=simulation();
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all',2,999));
  assert.equal(x.error,'document_not_found_or_not_linked');
  assert.equal(t.store.r2Deleted,0);
});
test('stale link count blocks destructive action',async()=>{
  const t=simulation();
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all',1));
  assert.equal(x.error,'document_links_changed');assert.equal(t.store.audit.length,0);
});
test('unlink one of two links leaves R2 and document intact, audit logged',async()=>{
  const t=simulation();
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('unlink'));
  assert.equal(x.ok,true);assert.equal(x.remaining_links,1);
  assert.deepEqual(t.store.links,[102]);assert.ok(t.store.doc);
  assert.equal(t.store.r2Deleted,0);assert.deepEqual(t.store.audit,['unlink']);
  assert.deepEqual(t.store.securityEvents,['admin.water_meter_document_unlink']);
});
test('unlink last link refused; require delete-all confirmation',async()=>{
  const t=simulation({count:1});
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('unlink',1));
  assert.equal(x.error,'last_link_requires_delete_all');assert.equal(t.store.r2Deleted,0);
});
test('delete all removes all links then metadata after R2; both audit events exist',async()=>{
  const t=simulation();
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all'));
  assert.equal(x.ok,true);assert.equal(x.removed_links,2);
  assert.equal(t.store.doc,null);assert.deepEqual(t.store.links,[]);
  assert.equal(t.store.r2Deleted,1);
  assert.deepEqual(t.store.audit,['delete_requested','delete_completed']);
  assert.deepEqual(t.store.securityEvents,['admin.water_meter_document_delete_all']);
});
test('R2 failure revokes download, exposes pending state and permits retry',async()=>{
  const t=simulation({failR2:true});
  const x=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all'));
  assert.equal(x.cleanup,'pending'); assert.equal(t.store.doc.delete_state,'pending');
  assert.equal(t.store.links.length,2);
  const list=await t.invoke('GET','/api/admin/water-meter-documents',null,'?meter_id=101');
  assert.equal(list.documents.length,0); assert.equal(list.pending_deletions.length,1);
  const download=await t.invoke('GET','/api/admin/water-meter-document',null,'?id='+uuid);
  assert.equal(download.status,404);
  t.store.failR2=false;
  const y=await t.invoke('DELETE','/api/admin/water-meter-document',deleteReq('delete_all'));
  assert.equal(y.ok,true);assert.equal(t.store.doc,null);
  assert.deepEqual(t.store.audit,['delete_requested','delete_completed']);
});
