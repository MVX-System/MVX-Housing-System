/** PR-10K.8B3J — static and safe-import tests (synthetic, no user files). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readRawExternalWaterWorksheet} from '../src/utils/externalWaterRawOOXML.mjs';
const ui=readFileSync(new URL('../src/components/ExternalWaterImportPreview.jsx',import.meta.url),'utf8');
const raw=readFileSync(new URL('../src/utils/externalWaterRawOOXML.mjs',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/pages/AdminMonthlyReportPage.jsx',import.meta.url),'utf8');
const parser=readFileSync(new URL('../src/utils/externalWaterXlsxParser.mjs',import.meta.url),'utf8');
test('B3J uses exact OOXML bytes, not number-converting SheetJS',()=>{
 assert.match(ui,/readRawExternalWaterWorksheet\(buffer\)/);
 assert.match(ui,/parseExternalWaterWorksheet\(sheet\)/);
 assert.doesNotMatch(ui,/import\('xlsx-js-style'\)/);
 assert.match(raw,/DecompressionStream\('deflate-raw'\)/);
 assert.match(raw,/if\(t==='n'\)ct='n'/);
 assert.match(parser,/decimalToMilli\(raw\)/);
});
test('B3J Excel picker is selected per run and native no-file label hidden',()=>{
 assert.match(ui,/type="file"/);
 assert.match(ui,/inputRef\.current\?\.click\(\)/);
 assert.match(ui,/selectedName/);
 assert.match(ui,/position:'absolute'/);
 assert.match(ui,/inputRef\.current\.value = ''/);
});
test('B3J preview is mounted after reporting period and before summary',()=>{
 const x=page.indexOf('<ExternalWaterImportPreview');
 const p=page.indexOf('{text.reportingPeriod}');
 const s=page.indexOf('<SummaryGroupCard');
 assert.ok(p>=0 && x>p && s>x,`${p},${x},${s}`);
 assert.equal(page.split('<ExternalWaterImportPreview').length-1,1);
});
test('B3J browser data is not uploaded or persisted',()=>{
 for(const forbidden of ['fetch(', 'axios', 'localStorage', 'sessionStorage','XMLHttpRequest', 'sendBeacon','submitAdminReading(']){
   assert.ok(!ui.includes(forbidden),forbidden);
   assert.ok(!raw.includes(forbidden),forbidden);
 }
 assert.match(ui,/local preview|lokāls priekšskatījums|локальный просмотр/i);
});
test('B3J retains strict archive limits and formula marker',()=>{
 for(const term of ['MAX_COMPRESSED=10_000_000','MAX_UNCOMPRESSED=32_000_000',
 'MAX_ENTRIES=200','MAX_CELLS=9000','ZIP_MEMBER_CHECKSUM_INVALID',
 "c.f='FORMULA_PRESENT'",'UNSAFE_XML_DECLARATION'])assert.ok(raw.includes(term),term);
});
test('B3J invalid or truncated ZIP fails closed',async()=>{
 await assert.rejects(readRawExternalWaterWorksheet(new Uint8Array([1,2,3])),/XLSX_SIZE_REJECTED/);
 await assert.rejects(readRawExternalWaterWorksheet(new Uint8Array(500)),/ZIP_END_RECORD_MISSING/);
});
test('B3J does not add import controls or server write endpoints',()=>{
 assert.ok(!ui.includes('DEPLOY TEST'));
 assert.ok(!/method\s*:\s*['"`]POST['"`]/.test(ui));
 assert.ok(!raw.includes('https://'));
});
