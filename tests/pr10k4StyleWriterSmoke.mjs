import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import XlsxWriter from 'xlsx-js-style';
import {buildMonthlyApartmentLayout} from '../src/utils/monthlyWaterApartmentLayout.mjs';
import {styleMonthlyApartmentWorksheet} from '../src/utils/monthlyWaterExcelStyles.mjs';

const XLSX = XlsxWriter?.default || XlsxWriter;
assert.ok(typeof XLSX?.utils?.aoa_to_sheet === 'function' && typeof XLSX?.write === 'function');
const slots = ['A1','A2','A3','K1','K2','K3'];
const meterRows=slots.map((source_slot,i)=>({
  meter_id: i+1, apartment_number: '22', source_slot,
  type:source_slot.startsWith('A')?'cold':'hot',
  current_reading:i===0?0:100+i*0.5,
  consumption:i===0?0:i===5?-338:i*0.25,
}));
const layout=buildMonthlyApartmentLayout({meterRows,apartmentRows:[{
  apartment_number:'22',cold_consumption:1.5,hot_consumption:3.5,
  total_consumption:5,meters_count:6,status:'Требует внимания',
}]});
assert.equal(layout.stats.meters,6);
assert.equal(layout.stats.zeroDeltas,1);
assert.equal(layout.stats.negativeDeltas,1);
const ws=XLSX.utils.aoa_to_sheet(layout.rows);
ws['!cols']=Array.from({length:18},(_,i)=>({wch:i>=13?20:12}));
ws['!autofilter']={ref:'A2:R3'};
styleMonthlyApartmentWorksheet(ws,layout.headerDividerIndices);
for(let c of 'BCDEFGHIJKLMNOP') if(ws[c+'3']?.t==='n') ws[c+'3'].z='0.000';
const wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,ws,'Квартиры');
const bin=XLSX.write(wb,{bookType:'xlsx',type:'buffer',cellStyles:true,compression:true});
assert.ok(bin?.length>3000,'XLSX buffer missing');
const file=process.argv[2];
if(!file) throw new Error('Usage: node pr10k4StyleWriterSmoke.mjs /tmp/pr10k4-style.xlsx');
writeFileSync(file,bin);
console.log('PR-10K.4 STYLE WRITER SMOKE GENERATED',file,bin.length,'bytes');
