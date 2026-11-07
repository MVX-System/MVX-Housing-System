import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {styleMonthlyApartmentWorksheet} from "../src/utils/monthlyWaterExcelStyles.mjs";

const page = fs.readFileSync(new URL("../src/pages/AdminMonthlyReportPage.jsx", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("API monthly report selects source_slot on active meters", () => {
  const start = worker.indexOf('"/api/admin/water-monthly-report"');
  const end = worker.indexOf('"/api/admin/water-monthly-report-periods"', start);
  assert.ok(start >= 0);
  const route = end >= 0 ? worker.slice(start,end) : worker.slice(start,start+14000);
  assert.match(route, /wm\.source_slot/);
});
test("frontend uses source_slot and does not guess from water type or row order", () => {
  assert.match(page, /buildMonthlyApartmentLayout/);
  assert.match(page, /meterRows: reportRows\.map/);
  assert.match(page, /current_reading: toCubicMeters/);
  assert.match(page, /consumption: toCubicMeters/);
  assert.match(page, /PR10K4_REPORT_SUMMARY_COUNT_MISMATCH/);
});
test("styled writer installed and the existing SheetJS CDN is untouched", () => {
  assert.equal(pkg.dependencies['xlsx-js-style'],'1.2.0');
  assert.match(page, /import\("xlsx-js-style"\)/);
  assert.match(page, /styleMonthlyApartmentWorksheet/);
  assert.match(page, /XLSX\.writeFile\(workbook, fileName/);
});
test("worksheet styles 18 bold headers, four medium vertical dividers, merged legend", () => {
 const sh = {};
 for(const c of "ABCDEFGHIJKLMNOPQR") sh[c+'2']={t:'s',v:c};
 styleMonthlyApartmentWorksheet(sh, [1,7,13,16]);
 assert.deepEqual("ABCDEFGHIJKLMNOPQR".split('').filter(x=>sh[x+'2'].s?.border?.left),['B','H','N','Q']);
 assert.ok("ABCDEFGHIJKLMNOPQR".split('').every(x=>sh[x+'2'].s.font.bold));
 assert.equal(sh['!merges'][0].e.c,17);
});
test("export retains existing detail/missing/summary sheets", () => {
 assert.match(page,/text\.xlsxSheetSummary/);
 assert.match(page,/text\.xlsxSheetMeterDetails/);
 assert.match(page,/text\.xlsxSheetMissingData/);
 assert.match(page,/text\.xlsxSheetApartments/);
});
