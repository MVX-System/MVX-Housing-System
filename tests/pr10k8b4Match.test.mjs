import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReadOnlyRegistryMatch,MATCH_STATES} from '../src/utils/externalWaterRegistryPreview.mjs';
const p={id:11,period_year:2026,period_month:10};
const meter=(o={})=>({meter_id:41,apartment_number:'21',serial_number:'123456',source_slot:'A1',type:'cold',
 current_reading:null,previous_reading:120000,...o});
const entry=(o={})=>({apartment_number:'21',serial_number:'123456',source_slot:'A1',type:'cold',
 source_row:25,reading_value:'122.125',source_notes:[],...o});
const parsed=(rows=[entry()])=>({previewOnly:true,sourceRows:rows,stats:{blankReadings:2}});
const report=(rows=[meter()],period=p)=>({period,rows,summary:{meters_total:rows.length}});
const run=(r=parsed(),v=report(),period=p)=>buildReadOnlyRegistryMatch(r,v,period);

test('exact active meter becomes pending policy, never approved write',()=>{
 const v=run();assert.equal(v.ready,true);assert.equal(v.rows[0].status,MATCH_STATES.POLICY);
 assert.equal(v.writeAuthorized,false);assert.equal(v.serverRevalidationRequired,true);
});
test('existing resident/admin value takes priority',()=>{
 const v=run(parsed(),report([meter({current_reading:121000})]));
 assert.equal(v.rows[0].status,MATCH_STATES.EXISTS);assert.equal(v.counts.exists,1);
});
test('identical existing value is idempotent',()=>{
 assert.equal(run(parsed(),report([meter({current_reading:122125})])).rows[0].status,MATCH_STATES.SAME);
});
test('formula-backed serial remains source HOLD despite match',()=>{
 const v=run(parsed([entry({source_notes:['FORMULA_SERIAL_CACHE_REQUIRES_REVIEW']})]));
 assert.equal(v.rows[0].status,MATCH_STATES.SOURCE_HOLD);assert.equal(v.rows[0].meter_id,null);
});
test('invalid decimal remains source HOLD',()=>{
 assert.equal(run(parsed([entry({reading_value:'122.1255',source_notes:['EXCESS_PRECISION']})])).rows[0].status,MATCH_STATES.SOURCE_HOLD);
});
test('missing previous must HOLD',()=>{
 assert.equal(run(parsed(),report([meter({previous_reading:null})])).rows[0].status,MATCH_STATES.MVX_HOLD);
});
test('negative consumption must HOLD',()=>{
 assert.equal(run(parsed(),report([meter({previous_reading:123000})])).rows[0].status,MATCH_STATES.MVX_HOLD);
});
test('wrong meter slot must HOLD',()=>{
 assert.equal(run(parsed(),report([meter({source_slot:'A2'})])).rows[0].status,MATCH_STATES.MVX_HOLD);
});
test('unmatched serial must HOLD',()=>{
 assert.equal(run(parsed([entry({serial_number:'777'})])).rows[0].status,MATCH_STATES.MVX_HOLD);
});
test('report from another period blocks all matching',()=>{
 const v=run(parsed(),report([meter()],{id:9,period_year:2026,period_month:9}));
 assert.equal(v.ready,false);assert.deepEqual(v.rows,[]);
});
test('report with mismatched meter count is blocked',()=>{
 const v=run(parsed(),{...report(),summary:{meters_total:2}});
 assert.equal(v.ready,false);assert.equal(v.reason,'REGISTRY_SUMMARY_MISMATCH');
});
test('no prior authentication snapshot is blocked',()=>{
 const v=run(parsed(),null);assert.equal(v.ready,false);assert.equal(v.writeAuthorized,false);
});
test('missing or non integer current/previous is blocked',()=>{
 assert.equal(run(parsed(),report([meter({current_reading:1.5})])).ready,false);
 assert.equal(run(parsed(),report([meter({previous_reading:undefined})])).ready,false);
});
test('duplicate registry meter identity is blocked',()=>{
 assert.equal(run(parsed(),report([meter(),meter({meter_id:42,source_slot:'A2'})])).ready,false);
});
test('both duplicate source positions remain on HOLD',()=>{
 const v=run(parsed([entry(),entry({serial_number:'123456',source_row:35})]));
 assert.equal(v.rows.length,2);assert.equal(v.counts.mvxHold,2);
});
test('only explicit zero is a real reading',()=>{
 const v=run(parsed([entry({reading_value:'0'})]),report([meter({previous_reading:0})]));
 assert.equal(v.rows[0].status,MATCH_STATES.POLICY);
});
test('no API or write permissions exposed by module',async()=>{
 const {readFileSync}=await import('node:fs');
 const text=readFileSync(new URL('../src/utils/externalWaterRegistryPreview.mjs',import.meta.url),'utf8');
 for(const pattern of [/\bfetch\s*\(/,/\bPOST\b/,/\.prepare\s*\(/,/\bINSERT\s+INTO\b/,/\bUPDATE\s+\w+\s+SET\b/])assert.doesNotMatch(text,pattern);
});
