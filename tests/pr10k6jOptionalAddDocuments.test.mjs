import test from 'node:test';
import assert from 'node:assert/strict';
import {
  METER_DOCUMENT_ACCEPT,
  METER_DOCUMENT_MAX_BYTES,
  planNewMeterDocuments,
  uploadOptionalMeterDocuments,
} from '../src/utils/meterDocumentOnAdd.mjs';

const f = (name,content='sample') => new File([content],name);

test('new meter with no documents makes zero upload calls and succeeds',async()=>{
 let n=0;
 const res=await uploadOptionalMeterDocuments({meterId:10,send:async()=>{n++;return {ok:true}}});
 assert.deepEqual(res,{uploaded:0,failed:[],attempted:0});assert.equal(n,0);
});

test('replacement act is optional; when selected it uses existing and newly registered meters',async()=>{
 const calls=[];
 const res=await uploadOptionalMeterDocuments({meterId:10,replacementActFile:f('act.pdf'),relatedActMeterIds:[2,3,2,10],send:async(path,params)=>{
   calls.push([path,params.body.get('document_kind'),JSON.parse(params.body.get('meter_ids'))]);return {ok:true};
 }});
 assert.equal(res.uploaded,1);
 assert.deepEqual(calls,[['/api/admin/water-meter-document','replacement_act',[10,2,3]]]);
});

test('multiple other files upload one per document to new meter only',async()=>{
 const calls=[];
 const res=await uploadOptionalMeterDocuments({meterId:42,otherDocumentFiles:[f('a.png'),f('b.docx'),f('c.xlsx')],send:async(path,params)=>{
   calls.push([params.body.get('document_kind'),JSON.parse(params.body.get('meter_ids'))]);return {ok:true};
 }});
 assert.equal(res.uploaded,3);
 assert.deepEqual(calls,[['other',[42]],['other',[42]],['other',[42]]]);
});

test('server error on one file cannot block other uploads; result tells admin to add missing files later',async()=>{
 let n=0;
 const res=await uploadOptionalMeterDocuments({meterId:42,otherDocumentFiles:[f('a.png'),f('b.pdf')],send:async()=>{n++;return n===1?{ok:false,error:'failed'}:{ok:true}}});
 assert.equal(res.uploaded,1);assert.equal(res.failed.length,1);assert.equal(res.failed[0].fileName,'a.png');
});

test('network error is caught per document and never thrown after creating the meter',async()=>{
 const res=await uploadOptionalMeterDocuments({meterId:42,replacementActFile:f('act.pdf'),send:async()=>{throw Error('network interrupted')}});
 assert.equal(res.uploaded,0);assert.equal(res.failed.length,1);
});

test('unsupported extension rejected before HTTP',async()=>{
 let n=0;
 const res=await uploadOptionalMeterDocuments({meterId:42,otherDocumentFiles:[f('script.exe')],send:async()=>{n++;return {ok:true}}});
 assert.equal(n,0);assert.equal(res.failed[0].issue,'unsupported_extension');
});

test('files > 20 MiB rejected before HTTP',async()=>{
 let n=0;
 const file={name:'large.pdf',size:METER_DOCUMENT_MAX_BYTES+1};
 const res=await uploadOptionalMeterDocuments({meterId:42,otherDocumentFiles:[file],send:async()=>{n++;return {ok:true}}});
 assert.equal(n,0);assert.equal(res.failed[0].issue,'invalid_file_size');
});

test('too many related meters reject act only (meter remains created)',async()=>{
 const ids=Array.from({length:13},(_,i)=>i+1);
 let n=0;
 const res=await uploadOptionalMeterDocuments({meterId:99,replacementActFile:f('act.jpg'),relatedActMeterIds:ids,otherDocumentFiles:[f('extra.pdf')],send:async()=>{n++;return {ok:true}}});
 assert.equal(n,1);assert.equal(res.uploaded,1);assert.equal(res.failed.length,1);assert.equal(res.failed[0].issue,'too_many_linked_meters');
});

test('invalid meter ID is rejected before upload',()=>{
 assert.throws(()=>planNewMeterDocuments({meterId:-1}),/invalid_new_meter_id/);
});

test('extension list covers approved formats',()=>{
 for(const extension of ['pdf','png','jpg','jpeg','doc','docx','xls','xlsx','edoc','asice']) assert.ok(METER_DOCUMENT_ACCEPT.includes('.'+extension));
});
