import test from 'node:test';
import assert from 'node:assert/strict';
import {decimalToMilli, classifyExternalWaterReadings as classify, REVIEW_STATUSES as S} from '../src/utils/externalWaterImportCore.mjs';
const registry=(o={})=>({meter_id:17,apartment_number:'22',serial_number:'S-001',source_slot:'A1',type:'cold',active:1,previous_reading_milli:10000,current_reading_milli:null,...o});
const source=(o={})=>({apartment_number:'22',serial_number:'S-001',source_slot:'A1',type:'cold',reading_value:'10.024',source_row:6,...o});
const check=(s=source(),r=registry(),max=10000)=>classify({sourceRows:[s],registryRows:[r],maxMonthlyConsumptionMilli:max}).candidates[0];

test('blank is missing not zero; explicit zero is zero',()=>{
 assert.equal(decimalToMilli('').milli,null);assert.equal(decimalToMilli('0').milli,0);
 assert.equal(decimalToMilli('0,024').milli,24);assert.equal(decimalToMilli(0.024).milli,24);
});
test('preserves exact thousandth and refuses forced rounding',()=>{
 assert.equal(decimalToMilli('1.234000').milli,1234);
 assert.equal(decimalToMilli('1.2345').ok,false);
 assert.equal(decimalToMilli(1.2345).ok,false);
});
test('rejects ambiguous or malformed decimals, negatives and large values',()=>{
 for(const v of ['1,234.5','1 200','-1','1e3','£25','NaN',Infinity,Number.MAX_VALUE])assert.equal(decimalToMilli(v).ok,false,String(v));
});
test('valid synthetic match produces ADD_CANDIDATE in milli-units',()=>{
 const c=check();assert.equal(c.status,S.ADD);assert.equal(c.meter_id,17);assert.equal(c.reading_milli,10024);assert.equal(c.delta_milli,24);
});
test('resident or any existing MVX reading always wins',()=>{
 const c=check(source(),registry({current_reading_milli:10008}));assert.equal(c.status,S.KEEP);
 assert.ok(c.reasons.includes('EXISTING_MVX_READING_TAKES_PRIORITY'));
});
test('same existing value is idempotent candidate, never ADD',()=>{
 assert.equal(check(source(),registry({current_reading_milli:10024})).status,S.SAME);
});
test('blank row is SKIP_BLANK, not an import candidate',()=>{
 assert.equal(check(source({reading_value:''})).status,S.SKIP);
});
test('missing previous is HOLD',()=>{
 assert.ok(check(source(),registry({previous_reading_milli:null})).reasons.includes('MISSING_PREVIOUS_READING'));
});
test('negative consumption is HOLD',()=>{
 assert.ok(check(source({reading_value:'9.99'})).reasons.includes('NEGATIVE_CONSUMPTION'));
});
test('monthly spike above explicitly supplied threshold is HOLD',()=>{
 assert.ok(check(source({reading_value:'12'}),registry(),1000).reasons.includes('ABOVE_REVIEW_THRESHOLD'));
});
test('without reviewed threshold no row may be ADD',()=>{
 assert.ok(check(source(),registry(),null).reasons.includes('THRESHOLD_NOT_CONFIGURED'));
});
test('apartment + serial + slot + type must all match',()=>{
 for(const r of [registry({serial_number:'S-002'}),registry({apartment_number:'23'}),registry({source_slot:'A2'}),registry({type:'hot'})]) assert.equal(check(source(),r).status,S.HOLD);
});
test('unrecognized declared source type cannot be guessed from slot',()=>{
 assert.equal(check(source({type:'UNKNOWN'})).status,S.HOLD);
});
test('inactive meter is HOLD',()=>{assert.ok(check(source(),registry({active:0})).reasons.includes('INACTIVE_METER'));});
test('unknown source slot or mismatch type blocks',()=>{
 assert.equal(check(source({source_slot:'A4'})).status,S.HOLD);
 assert.equal(check(source({type:'hot'})).status,S.HOLD);
});
test('registry without current+previous values is not an authority snapshot',()=>{
 const r=registry();delete r.current_reading_milli;
 assert.ok(check(source(),r).reasons.includes('INCOMPLETE_AUTHORITY_SNAPSHOT'));
});
test('both occurrences of source duplicates become HOLD',()=>{
 const out=classify({sourceRows:[source(),source({source_row:8})],registryRows:[registry()],maxMonthlyConsumptionMilli:10000});
 assert.equal(out.counts.HOLD,2);
});
test('two serials on same apartment/slot are both HOLD',()=>{
 const out=classify({sourceRows:[source(),source({source_row:7,serial_number:'S-002'})],registryRows:[registry(),registry({meter_id:18,serial_number:'S-002'})],maxMonthlyConsumptionMilli:10000});
 assert.equal(out.counts.HOLD,2);
});
test('ambiguous registry identity blocks instead of choosing a meter',()=>{
 assert.ok(classify({sourceRows:[source()],registryRows:[registry(),registry({meter_id:18})],maxMonthlyConsumptionMilli:10000}).candidates[0].reasons.includes('AMBIGUOUS_REGISTRY_IDENTITY'));
});
test('does not authorize writes by design',()=>{
 const o=classify({sourceRows:[source()],registryRows:[registry()],maxMonthlyConsumptionMilli:10000});
 assert.equal(o.preview_only,true);assert.equal(o.write_authorized,false);
});
