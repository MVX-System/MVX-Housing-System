import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExternalWaterWorksheet,buildExternalImportPreview,anonymizedSourceReceipt} from '../src/utils/externalWaterXlsxParser.mjs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
function sheet(){
  const s={'!ref':'A1:O19'},C=(a,v,t='s',f=null)=>s[a]={v,t,...(f?{f}: {})};
  for(let b=0;b<2;b++){
    let r=4+7*b;
    C(`A${r-1}`,b?'22':'21','n');
    if(b===0)for(let i=0;i<6;i++)C(`${'IJKLMN'[i]}3`,['A1','A2','A3','K1','K2','K3'][i]);
    C(`B${r}`,'Skait. Nr');C(`B${r+1}`,'Tek.periods');C(`B${r+2}`,'Iepr.periods');
  }
  C('I4','12345','n');C('I5','10.125','n');
  C('J4','2234','n','FORMULA_PRESENT');C('J5','11','n');
  C('K4','5566','n','FORMULA_PRESENT');
  C('L4','S-ZERO','s');C('L5','0','n');
  C('M4','1234567890123456','n');C('M5','1','n');
  C('N4','23456','n');C('N5','2.1234','n');
  C('I11','S-2','s');C('I12','-1','n');
  C('J11','S-3','s');C('J12','1.0000','n');
  C('K11','S-4','s');C('K12','12','n','FORMULA_PRESENT');
  C('C5','9999','n');C('L6','9999','n');
  return s;
}
test('source-only: skip blanks irrespective of formula-backed serial',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  assert.equal(p.stats.apartmentBlocks,2);
  assert.equal(p.stats.totalSlots,12);
  assert.equal(p.stats.blankReadings,4);
  assert.equal(p.stats.validReadings,5);
  assert.equal(p.stats.invalidReadings,3);
  assert.equal(p.sourceRows.length,8);
  assert.ok(!p.sourceRows.some(x=>x.source_slot==='A3'&&x.apartment_number==='21'));
});
test('cached formula serial may be compared, never silently cleared',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  const r=p.sourceRows.find(x=>x.apartment_number==='21'&&x.source_slot==='A2');
  assert.equal(r.serial_number,'2234');
  assert.equal(r.source_serial_origin,'FORMULA_CACHE');
  assert.deepEqual(r.source_notes,['FORMULA_SERIAL_CACHE_REQUIRES_REVIEW']);
});
test('numeric serial kept as exact integer string when safe',()=>{
  const r=parseExternalWaterWorksheet(sheet()).sourceRows.find(x=>x.source_slot==='A1');
  assert.equal(r.serial_number,'12345');assert.equal(r.source_notes.length,0);
});
test('unsafe numeric serial is held, not rounded',()=>{
  const r=parseExternalWaterWorksheet(sheet()).sourceRows.find(x=>x.source_slot==='K2'&&x.apartment_number==='21');
  assert.equal(r.serial_number,'');assert.ok(r.source_notes.includes('UNSAFE_NUMERIC_SERIAL'));
});
test('no rounding: >3 meaningful decimal digits is HOLD',()=>{
  const r=parseExternalWaterWorksheet(sheet()).sourceRows.find(x=>x.source_slot==='K3'&&x.apartment_number==='21');
  assert.equal(r.reading_value,'2.1234');assert.ok(r.source_notes.includes('EXCESS_PRECISION'));
});
test('literal zero is a valid reading',()=>{
  const r=parseExternalWaterWorksheet(sheet()).sourceRows.find(x=>x.source_slot==='K1'&&x.apartment_number==='21');
  assert.equal(r.reading_value,'0');assert.deepEqual(r.source_notes,[]);
});
test('formulas in current values never become readings',()=>{
  const r=parseExternalWaterWorksheet(sheet()).sourceRows.find(x=>x.source_slot==='A3'&&x.apartment_number==='22');
  assert.equal(r.reading_value,null);assert.ok(r.source_notes.includes('CURRENT_IS_FORMULA'));
});
test('ambiguous apartment is not guessed',()=>{
  const s=sheet();s.A4={t:'n',v:'99'};
  const p=parseExternalWaterWorksheet(s);
  assert.equal(p.stats.ambiguousApartmentBlocks,1);
  assert.ok(p.sourceRows.some(x=>x.source_notes.includes('AMBIGUOUS_APARTMENT_CELL')));
});
test('global column header must be exact and unique',()=>{
  const s=sheet();s.I3={t:'s',v:'WRONG'};
  assert.throws(()=>parseExternalWaterWorksheet(s),/GLOBAL_HEADER_MISSING_OR_DUPLICATE/);
});
test('no premature ADD for cached formula even if registry matches',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  const registry=[{meter_id:2,apartment_number:'21',source_slot:'A2',serial_number:'2234',type:'cold',active:1,
    previous_reading_milli:10000,current_reading_milli:null}];
  const view=buildExternalImportPreview(p,registry,{maxMonthlyConsumptionMilli:5000});
  const x=view.rows.find(x=>x.source_slot==='A2'&&x.apartment_number==='21');
  assert.equal(x.status,'HOLD');assert.ok(x.reasons.includes('FORMULA_SERIAL_CACHE_REQUIRES_REVIEW'));
  assert.equal(view.writeAuthorized,false);
});
test('read-only preview can yield candidate for exact registry match, not write approval',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  const registry=[{meter_id:1,apartment_number:'21',source_slot:'A1',serial_number:'12345',type:'cold',active:1,
    previous_reading_milli:10000,current_reading_milli:null}];
  const view=buildExternalImportPreview(p,registry,{maxMonthlyConsumptionMilli:5000});
  const x=view.rows.find(x=>x.source_slot==='A1'&&x.apartment_number==='21');
  assert.equal(x.status,'ADD_CANDIDATE');assert.equal(view.writeAuthorized,false);
});
test('prior MVX reading always wins over imported reading',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  const registry=[{meter_id:1,apartment_number:'21',source_slot:'A1',serial_number:'12345',type:'cold',active:1,
    previous_reading_milli:9000,current_reading_milli:9000}];
  const view=buildExternalImportPreview(p,registry,{maxMonthlyConsumptionMilli:5000});
  assert.equal(view.rows.find(x=>x.source_slot==='A1'&&x.apartment_number==='21').status,'KEEP_MVX');
});
test('source-only output is aggregate-only and no raw values escape',()=>{
  const p=parseExternalWaterWorksheet(sheet());
  const receipt=anonymizedSourceReceipt(p),v=JSON.stringify(receipt);
  assert.equal(receipt.stats.blankReadings,4);
  for(const secret of ['S-ZERO','1234567890123456','2234','2.1234'])assert.ok(!v.includes(secret));
  assert.equal(receipt.writeAuthorized,false);
});
test('real ZIP/xlsx synthetic fixture bridge remains supported with no npm install',()=>{
  const bridge=path.resolve(here,'../tools/pr10k8b2_xlsx_bridge.py');
  const fixture=path.resolve(here,'fixtures/synthetic_external_readings.xlsx');
  const run=spawnSync('python3',[bridge,fixture],{encoding:'utf8',timeout:30000,maxBuffer:1e6});
  assert.equal(run.status,0,run.stderr);
  const p=parseExternalWaterWorksheet(JSON.parse(run.stdout));
  assert.equal(p.stats.apartmentBlocks,2);
  assert.equal(p.previewOnly,true);
});
