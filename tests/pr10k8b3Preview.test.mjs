import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inferMonthYearFromFileName,assertFilePeriod,buildSourceOnlyPreview,PREVIEW_STATES} from '../src/utils/externalWaterImportPreviewModel.mjs';
const period={period_month:10,period_year:2026};
test('Excel period is extracted only from explicit month-year filename',()=>{
 assert.deepEqual(inferMonthYearFromFileName('Ūdens 10-2026.xlsx'),{month:10,year:2026});
 assert.deepEqual(inferMonthYearFromFileName('external_2026-10.xlsx'),{month:10,year:2026});
 assert.equal(inferMonthYearFromFileName('water-readings.xlsx'),null);
 assert.equal(inferMonthYearFromFileName('2026-10_2026-11.xlsx'),null);
});
test('period mismatch blocks preview',()=>assert.throws(()=>assertFilePeriod('Ūdens 11-2026.xlsx',period),/FILE_PERIOD_MISMATCH/));
test('explicit selection permits other source file names',()=>assert.equal(assertFilePeriod('readings.xlsx',period).filePeriodExplicit,false));
test('legacy xls and empty period are not accepted',()=>{
 assert.throws(()=>assertFilePeriod('r.xls',period),/XLSX_REQUIRED/);
 assert.throws(()=>assertFilePeriod('r.xlsx',null),/PERIOD_NOT_SELECTED/);
});
test('source rows are never classified as approved import or D1 match',()=>{
 const parsed={previewOnly:true,stats:{totalSlots:3,blankReadings:1,validReadings:1,invalidReadings:1,requiresReview:1},sourceRows:[
   {source_row:12,apartment_number:'1',serial_number:'55',source_slot:'A1',reading_value:'5.555',source_notes:[]},
   {source_row:22,apartment_number:'2',serial_number:'77',source_slot:'K2',reading_value:'5.5555',source_notes:['EXCESS_PRECISION']}
 ]};
 const v=buildSourceOnlyPreview(parsed,{fileName:'Ūdens 10-2026.xlsx',period});
 assert.deepEqual([v.rows[0].status,v.rows[1].status],[PREVIEW_STATES.CHECK,PREVIEW_STATES.HOLD]);
 assert.equal(v.counts.skippedBlanks,1);
 assert.equal(v.previewOnly,true);assert.equal(v.writeAuthorized,false);assert.equal(v.registryVerified,false);assert.equal(v.dataSentToServer,false);
});
test('contradictory source aggregate is rejected',()=>{
 assert.throws(()=>buildSourceOnlyPreview({previewOnly:true,stats:{totalSlots:3,blankReadings:0,validReadings:2,invalidReadings:0,requiresReview:0},sourceRows:[]},{fileName:'r.xlsx',period}),/INCONSISTENT_PARSE_COUNTS/);
});
test('UI has no persistence, uploads, POSTs, or write controls',()=>{
 const ui=readFileSync(new URL('../src/components/ExternalWaterImportPreview.jsx',import.meta.url),'utf8');
 assert.match(ui,/type="file"/);
 assert.match(ui,/import\('xlsx-js-style'\)/);
 assert.match(ui,/parseExternalWaterWorksheet/);
 for(const banned of ['fetch(', 'axios', 'localStorage', 'sessionStorage', 'navigator.sendBeacon', 'XMLHttpRequest', 'formData.append', 'writeFile(', 'submitAdminReading(']) {
   assert.equal(ui.includes(banned),false,`Unexpected data egress / write: ${banned}`);
 }
});
