import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync(new URL('../src/pages/AdminMonthlyReportPage.jsx', import.meta.url),'utf8');

test('fifth sheet uses only the existing reportRows and localized totals',()=>{
 assert.match(page,/import \{ buildMonthlyWaterAnomalyReview, styleMonthlyWaterAnomalyWorksheet \}/);
 assert.match(page,/buildMonthlyWaterAnomalyReview\(\{/);
 assert.match(page,/previous_reading: toCubicMeters\(row\.previous_reading\)/);
 assert.match(page,/current_reading: toCubicMeters\(row\.current_reading\)/);
 assert.match(page,/consumption: toCubicMeters\(row\.consumption\)/);
 assert.match(page,/anomalyReview\.counts\.metersChecked !== Number\(summary\.meters_total\)/);
 assert.match(page,/book_append_sheet\(workbook, anomalySheet, anomalyReview\.sheetName\)/);
});

test('all existing export sheets and their order are preserved',()=>{
 const s=['text.xlsxSheetSummary','text.xlsxSheetApartments','text.xlsxSheetMeterDetails','text.xlsxSheetMissingData','anomalyReview.sheetName'];
 const indices=s.map(x=> x==='anomalyReview.sheetName' ? page.indexOf('XLSX.utils.book_append_sheet(workbook, anomalySheet, anomalyReview.sheetName)', page.indexOf('const handleDownloadXlsx')) : page.indexOf('      '+x+'\n',page.indexOf('const handleDownloadXlsx')));
 assert.ok(indices.every(x=>x>=0),indices.join(','));
 assert.deepEqual(indices,[...indices].sort((a,b)=>a-b));
});

test('the anomaly module has no write operations or API/Worker calls',()=>{
 const module=fs.readFileSync(new URL('../src/utils/monthlyWaterAnomalyReview.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(module,/fetch\(|wrangler|\.prepare\(|writeFile\(|localStorage\./);
});
