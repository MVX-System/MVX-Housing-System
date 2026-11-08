import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyWaterAnomalyReview as assess,
  styleMonthlyWaterAnomalyWorksheet as style,
  HIGH_CONSUMPTION_M3,
  COMPARISON_TOLERANCE_M3,
} from '../src/utils/monthlyWaterAnomalyReview.mjs';

const meter=(p={})=>({apartment_number:'10',meter_id:p.meter_id??p.serial_number??'meter-1',type:'cold',source_slot:'A1',serial_number:'111',riser_code:'CW-E1-1R-B',previous_reading:100,current_reading:102,consumption:2,...p});
const total=(p={})=>({apartment_number:'10',cold_consumption:2,hot_consumption:0,total_consumption:2,...p});
const run=(m,a,extras)=>assess({meterRows:m,apartmentRows:a,...extras});

test('no false positives for correct reading, zero and missing reading',()=>{
 const m=[meter(),meter({meter_id:'m2',source_slot:'A2',serial_number:'112',previous_reading:15,current_reading:15,consumption:0}),meter({meter_id:'m3',source_slot:'K1',type:'hot',serial_number:'113',riser_code:'HW-E1-1R-K',previous_reading:20,current_reading:null,consumption:null})];
 const r=run(m,[total()]);
 assert.deepEqual(r.counts,{critical:0,review:0,total:0,apartments:0,metersChecked:3,missingReadings:1});
 assert.equal(r.rows[6][0],'Замечаний по действующим правилам не обнаружено.');
 assert.equal(r.rows[5].length,12);
});

test('apartment with negative, two large amounts, two riser mismatches and subtotal: six findings',()=>{
 const m=[
  meter({meter_id:'m1',source_slot:'A3',type:'cold',serial_number:'COLD-A3',riser_code:'HW-E2-3R-B',previous_reading:126,current_reading:414.5,consumption:288.5}),
  meter({meter_id:'m2',source_slot:'K1',type:'hot',serial_number:'HOT-K1',riser_code:'HW-E2-1R-B',previous_reading:414,current_reading:468,consumption:54}),
  meter({meter_id:'m3',source_slot:'K3',type:'hot',serial_number:'HOT-K3',riser_code:'CW-E2-3R-B',previous_reading:466.5,current_reading:128.5,consumption:-338}),
 ];
 const a=[total({cold_consumption:288.5,hot_consumption:54,total_consumption:342.5})];
 const r=run(m,a);
 assert.deepEqual(r.counts,{critical:1,review:5,total:6,apartments:1,metersChecked:3,missingReadings:0});
 assert.deepEqual(r.issues.map(x=>x.code).sort(),['APARTMENT_TOTAL_REVIEW','HIGH_DELTA','HIGH_DELTA','NEGATIVE_DELTA','RISER_TYPE_CONFLICT','RISER_TYPE_CONFLICT'].sort());
 assert.ok(r.issues.some(x=>x.delta===-338 && x.slot==='K3'));
 assert.ok(r.issues.some(x=>x.delta===288.5 && x.slot==='A3'));
 assert.ok(r.issues.some(x=>x.code==='APARTMENT_TOTAL_REVIEW' && x.description.includes('4.500')));
 assert.equal(r.rows.length,12);
});

test('above threshold warns, exactly threshold does not',()=>{
 const m=meter({previous_reading:20,current_reading:40,consumption:20});
 assert.equal(run([m],[total({cold_consumption:20,total_consumption:20})]).counts.total,0);
 m.current_reading=40.001;m.consumption=20.001;
 assert.equal(run([m],[total({cold_consumption:20.001,total_consumption:20.001})]).issues[0].code,'HIGH_DELTA');
});

test('negative is critical but zero is never missing or negative',()=>{
 const a=run([meter({previous_reading:100,current_reading:99,consumption:-1})],[total({cold_consumption:-1,total_consumption:-1})]);
 assert.equal(a.counts.critical,1);
 assert.ok(a.issues.some(x=>x.code==='NEGATIVE_DELTA'));
});

test('independent arithmetic difference detected with tolerance',()=>{
 const r=run([meter({previous_reading:100,current_reading:103,consumption:1})],[total({cold_consumption:1,total_consumption:1})]);
 assert.ok(r.issues.some(x=>x.code==='DELTA_MISMATCH'));
 assert.equal(COMPARISON_TOLERANCE_M3>0,true);
});

test('misclassified A/K slot is identified but no meter removed',()=>{
 const m=meter({source_slot:'K1',type:'cold',riser_code:'CW-E1-1R-B'});
 const r=run([m],[total()]);
 assert.equal(r.counts.metersChecked,1);
 assert.deepEqual(r.issues.map(x=>x.code),['SLOT_TYPE_CONFLICT']);
});

test('strange water codes are not invented from riser',()=>{
 const m=meter({riser_code:'XW-A12'});
 assert.equal(run([m],[total()]).issues.length,0);
});

test('empty row set yields a legitimate worksheet with header',()=>{
 const r=run([],[]);
 assert.equal(r.rows.length,7);
 assert.equal(r.rows[5][0],'Уровень');
 assert.equal(r.sheetName,'Нестандартные значения');
});

test('multiple apartments separate totals and do not cause cross-apt false positive',()=>{
 const m=[meter(),meter({meter_id:'m2',apartment_number:'20',serial_number:'112',previous_reading:5,current_reading:6,consumption:1})];
 const a=[total(),total({apartment_number:'20',cold_consumption:1,total_consumption:1})];
 assert.equal(run(m,a).counts.total,0);
});

test('format supports all three locales and Excel sheet length limit',()=>{
 for (const [lng,sheet] of [['ru','Нестандартные значения'],['lv','Nestandarta vērtības'],['en','Anomaly Review']]){
  const r=run([meter()],[total()],{language:lng});
  assert.equal(r.sheetName,sheet);
  assert.ok(r.sheetName.length<=31);
  assert.equal(r.rows[5].length,12);
 }
});

test('prevents accidental Excel formula injection in serial / riser fields',()=>{
 const m=meter({serial_number:'=HYPERLINK("bad")',riser_code:'=CALL(1)',type:'hot',source_slot:'K1',previous_reading:5,current_reading:30,consumption:25});
 const r=run([m],[total({cold_consumption:0,hot_consumption:25,total_consumption:25})]);
 assert.equal(r.issues.length,1);
 assert.ok(r.issues[0].serial.startsWith("'="));
 assert.ok(r.issues[0].riser.startsWith("'="));
});

test('duplicate meter ID fails closed',()=>{
 assert.throws(()=>run([meter(),meter({source_slot:'A2',serial_number:'112',meter_id:'meter-1'})],[total({cold_consumption:4,total_consumption:4})]),/DUPLICATE_METER/);
});

test('invalid numeric values fail closed',()=>{
 assert.throws(()=>run([meter({current_reading:'not-a-number'})],[total()]),/INVALID_NUMERIC/);
 assert.throws(()=>run([meter({consumption:Infinity})],[total()]),/INVALID_NUMERIC/);
});

test('review styles do not require editing any existing workbook sheet',()=>{
 const r=run([meter({previous_reading:100,current_reading:99,consumption:-1})],[total({cold_consumption:-1,total_consumption:-1})]);
 const sh={};
 for(const [i,row] of r.rows.entries())for(const [j,v] of row.entries())if(v!==null&&v!==undefined&&v!=='')sh[`${'ABCDEFGHIJKL'[j]}${i+1}`]={t:typeof v==='number'?'n':'s',v};
 style(sh,r);
 assert.equal(sh['!merges'].length,2);
 assert.equal(sh['!autofilter'].ref,`A6:L${r.rows.length}`);
 assert.ok(sh.A6.s.font.bold);
 assert.equal(sh.A7.s.fill.fgColor.rgb,'FEE2E2');
 assert.equal(sh.J7.z,'0.000');
});

test('current negative with no reported consumption gets its own alert',()=>{
 const r=run([meter({previous_reading:5,current_reading:4,consumption:null})],[total({cold_consumption:0,total_consumption:0})]);
 assert.ok(r.issues.some(x=>x.code==='REVERSED_READING'));
});

test('missing readings are counted but not duplicated as anomalies',()=>{
 const rows=Array.from({length:283},(_,i)=>meter({meter_id:`m${i}`,serial_number:`S${i}`,source_slot:'A1',previous_reading:1,current_reading:null,consumption:null}));
 const r=run(rows,[total({cold_consumption:0,total_consumption:0})]);
 assert.equal(r.counts.total,0);
 assert.equal(r.counts.missingReadings,283);
});

test('rejects invalid thresholds',()=>{
 assert.throws(()=>run([meter()],[total()],{thresholdM3:0}),/INVALID_INPUT/);
 assert.equal(HIGH_CONSUMPTION_M3,20);
});
