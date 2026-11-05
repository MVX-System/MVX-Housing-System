// PR-10K.1M.2: DEMO-specific integration invariants
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../worker.js', import.meta.url),'utf8');
const page=readFileSync(new URL('../src/pages/ResidentWaterPage.jsx', import.meta.url),'utf8');
const hook=readFileSync(new URL('../src/hooks/useWater.js', import.meta.url),'utf8');
const modal=readFileSync(new URL('../src/components/MeterHistoryModal.jsx', import.meta.url),'utf8');
test('DEMO cron behavior preserved',()=>{
 assert.match(worker,/ctx\.waitUntil\(\s*SecurityHousekeeping\.run\(env\)/);
});
test('DEMO reporting-period sync missing result is handled safely',()=>{
 assert.match(worker,/if \(syncResult\?\.skipped\)/);
});
test('DEMO meter API explicitly returns active flag',()=>{
 const start=worker.indexOf('Router.register("GET", "/api/my-water-meters"');
 const end=worker.indexOf('// MY WATER METER HISTORY',start);
 assert.ok(start>=0&&end>start);
 assert.match(worker.slice(start,end),/wm\.active AS active/);
});
test('one batch endpoint and existing single submit route',()=>{
 assert.equal(worker.split('"/api/submit-water-readings-batch"').length-1,1);
 assert.equal(worker.split('"/api/submit-water-reading"').length-1,1);
});
test('DEMO period presentation retained and unified form connected',()=>{
 assert.match(page,/const getDateLocale = \(\) =>/);
 assert.match(page,/meters\.length === 1/);
 assert.match(page,/<WaterReadingUnifiedForm/);
 assert.match(page,/history=\{localizedMeterHistory\}/);
 assert.doesNotMatch(page,/<WaterCard/);
});
test('batch hook exported, existing single and admin submit retained',()=>{
 assert.match(hook,/const submitBatchReadings = async/);
 assert.match(hook,/\s+submitBatchReadings,/);
 assert.match(hook,/const submitAdminReading/);
 assert.match(hook,/const submitReading/);
});
test('history locale bound before use',()=>{
 assert.match(modal,/const\s*\{\s*t,\s*language,\s*\}\s*=\s*useTranslation\(\)/);
});
