import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/pages/AdminMonthlyReportPage.jsx',import.meta.url),'utf8');
const helper=readFileSync(new URL('../src/utils/monthlyWaterSubmissionCoverage.mjs',import.meta.url),'utf8');

test('all three languages distinguish any/full/partial/none/missing',()=>{
  for(const key of ['apartmentsAny','apartmentsSubmitted','apartmentsPartial','apartmentsNone','apartmentsMissing']) {
    assert.equal((source.match(new RegExp('\\b'+key+':','g'))||[]).length,3,key);
  }
  for(const label of ['Квартиры с хотя бы одним показанием','Квартиры с полным комплектом показаний','Квартиры с частичным комплектом показаний','Квартиры без полученных показаний','Квартиры с пропущенными показаниями']) assert.ok(source.includes(label));
});

test('screen and XLSX use derived counts while API keeps original meaning',()=>{
  assert.match(source,/const submissionCoverage = useMemo\(/);
  assert.match(source,/\.\.\.buildMonthlyCoverageSummaryRows\(text, coverage\)/);
  assert.match(source,/assertMonthlyCoverageMatchesSummary\(coverage, summary\)/);
  assert.ok(!source.includes('[\n        text.apartmentsSubmitted,\n        Number('));
});

test('missing data export excludes negative consumption but retains missing previous',()=>{
  const part=source.split('// MISSING DATA')[1].split('// READ-ONLY UNUSUAL VALUE REVIEW')[0];
  assert.match(part,/selectMissingMonthlyReadingRows\(reportRows\)/);
  assert.ok(!part.includes('row.status !=='));
  assert.match(source,/isMissingReadingStatus\(row.status\)/);
  assert.match(helper,/'missing_current', 'missing_previous'/);
});

test('water totals numeric formatting no longer assumes old fixed rows',()=>{
  assert.match(source,/const firstWaterTotalRow = summaryData\.findIndex\(/);
  assert.match(source,/firstWaterTotalRow \+ 2/);
  assert.ok(!source.includes('summarySheet,\n      ["B"],\n      17,\n      19'));
});

test('no Worker, D1, or external API changes in helper',()=>{
  assert.doesNotMatch(helper, /\b(fetch|wrangler|execute|DELETE|UPDATE|INSERT|DB\.prepare)\s*\(/);
});
