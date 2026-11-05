// PR-10K.1N — partial submission regression tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateFormState, buildSubmission } from '../src/features/water-reporting/waterReadingLogic.js';
const worker = readFileSync(new URL('../worker.js', import.meta.url),'utf8');
const page = readFileSync(new URL('../src/pages/ResidentWaterPage.jsx', import.meta.url),'utf8');
const form = readFileSync(new URL('../src/features/water-reporting/WaterReadingUnifiedForm.jsx', import.meta.url),'utf8');
const hook = readFileSync(new URL('../src/hooks/useWater.js', import.meta.url),'utf8');
const period=41;
const meters = [
 {id: 1, previous:'10.000', submitted:true, submittedValue:'10.500'},
 {id: 2, previous:'7.000'},
 {id: 3, previous:'4.000'},
];
test('partial apartment: submitted meter is complete and locked logically',()=>{
 const state=calculateFormState(meters,{'2':'7.200','3':'4.300'},{});
 assert.equal(state.total,3);
 assert.equal(state.pending,2);
 assert.equal(state.completed,3);
 assert.equal(state.canSubmit,true);
 assert.equal(state.totalConsumption,1000);
});
test('batch submits only pending meters and retains stale baseline validation',()=>{
 const batch=buildSubmission({meters,drafts:{2:'7.200',3:'4.300'},unchanged:{},reportingPeriodId:period});
 assert.deepEqual(batch.readings.map(r=>r.meterId),['2','3']);
 assert.equal(batch.readings[0].expectedPrevious,7000);
});
test('all-submitted apartment cannot submit an empty retry',()=>{
 const done=meters.map(m=>({...m,submitted:true,submittedValue:m.submittedValue||m.previous}));
 const st=calculateFormState(done,{},{});
 assert.equal(st.pending,0);
 assert.equal(st.canSubmit,false);
 assert.throws(()=>buildSubmission({meters:done,drafts:{},unchanged:{},reportingPeriodId:period}));
});
test('pending meter validation still blocks the entire remaining batch',()=>{
 const state=calculateFormState(meters,{'2':'6.000','3':'4.300'},{});
 assert.equal(state.canSubmit,false);
});
test('get-meter route provides current acceptance and prior-period baseline separately',()=>{
 const start=worker.indexOf('Router.register("GET", "/api/my-water-meters"');
 const end=worker.indexOf('// MY WATER METER HISTORY',start);
 assert.ok(start>0&&end>start);
 const route=worker.slice(start,end);
 assert.match(route,/current_period_reading_value/);
 assert.match(route,/prior_period_reading_value/);
 assert.match(route,/reporting_period_id = \?/);
});
test('batch SQL uses all-and-only pending active apartment meters',()=>{
 const start=worker.indexOf('Router.register("POST", "/api/submit-water-readings-batch"');
 const end=worker.indexOf('// SUBMIT WATER READING',start);
 assert.ok(start>0&&end>start);
 const route=worker.slice(start,end);
 assert.match(route,/pending_meters AS/);
 assert.match(route,/SELECT COUNT\(\*\) FROM pending_meters/);
 assert.match(route,/v\.input_count = v\.expected_count/);
 assert.match(route,/v\.acceptable_count = v\.input_count/);
 assert.match(route,/already_submitted = 0/);
 assert.match(route,/new Date\(\)\.toISOString\(\)/);
});
test('UI shows submitted state, excludes it from checkbox and reloads period first',()=>{
 assert.match(form,/meter\.submitted \?/);
 assert.match(form,/form\.pending === 0/);
 assert.match(page,/await loadWaterReportingPeriod\(\)/);
 assert.match(page,/prior_period_reading_value/);
 assert.match(hook,/loadMyWater\(batch\.reportingPeriodId\)/);
});
