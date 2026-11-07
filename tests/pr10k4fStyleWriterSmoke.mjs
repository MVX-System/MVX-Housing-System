/** PR-10K.4F: real XLSX writer smoke with synthetic data only. */
import fs from 'node:fs';
import {buildMonthlyWaterAnomalyReview,styleMonthlyWaterAnomalyWorksheet} from '../src/utils/monthlyWaterAnomalyReview.mjs';
const out=process.argv[2];
if(!out) throw new Error('usage: node tests/pr10k4fStyleWriterSmoke.mjs /tmp/fifth_sheet.xlsx');
const importXlsx=await import('xlsx-js-style');
const XLSX=importXlsx.default||importXlsx;
const wb=XLSX.utils.book_new();
for(const name of ['Сводка','Квартиры','Данные счётчиков','Отсутствующие данные']){
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[name],[1]]),name);
}
const review=buildMonthlyWaterAnomalyReview({
 language:'ru',periodName:'октябрь 2026 г.',
 meterRows:[
   {meter_id:1,apartment_number:'22',source_slot:'A3',type:'cold',serial_number:'SYN-A3',riser_code:'HW-E2-3R-B',previous_reading:126,current_reading:414.5,consumption:288.5},
   {meter_id:2,apartment_number:'22',source_slot:'K1',type:'hot',serial_number:'SYN-K1',riser_code:'HW-E2-1R-B',previous_reading:414,current_reading:468,consumption:54},
   {meter_id:3,apartment_number:'22',source_slot:'K3',type:'hot',serial_number:'SYN-K3',riser_code:'CW-E2-3R-B',previous_reading:466.5,current_reading:128.5,consumption:-338},
 ],
 apartmentRows:[{apartment_number:'22',cold_consumption:288.5,hot_consumption:54,total_consumption:342.5}],
});
const sheet=XLSX.utils.aoa_to_sheet(review.rows);
styleMonthlyWaterAnomalyWorksheet(sheet,review);
XLSX.utils.book_append_sheet(wb,sheet,review.sheetName);
XLSX.writeFile(wb,out,{bookType:'xlsx',compression:true,cellStyles:true});
console.log(`PR-10K.4F REAL XLSX SMOKE: ${fs.statSync(out).size} bytes, ${review.counts.total} synthetic alerts, sheets=${wb.SheetNames.length}`);
