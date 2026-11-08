import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeMonthlySubmissionCoverage, assertMonthlyCoverageMatchesSummary,
  isMissingReadingStatus, buildMonthlyCoverageSummaryRows, selectMissingMonthlyReadingRows,
} from '../src/utils/monthlyWaterSubmissionCoverage.mjs';

const meter = (apt, index, current, status='complete') => ({
  apartment_id: apt, apartment_number: String(apt), meter_id:`m-${apt}-${index}`,
  current_reading: current, status,
});

test('complete, partial and no readings must be disjoint', () => {
  const rows=[
    meter(1,1,0),meter(1,2,10),
    meter(2,1,0),meter(2,2,null,'missing_current'),
    meter(3,1,null,'missing_current'),meter(3,2,null,'missing_current'),
  ];
  const a=summarizeMonthlySubmissionCoverage(rows);
  assert.deepEqual([a.total,a.any,a.complete,a.partial,a.none,a.withMissing], [3,2,1,1,1,2]);
  assert.deepEqual([a.metersTotal,a.readingsReceived,a.missingCurrent], [6,3,3]);
  assertMonthlyCoverageMatchesSummary(a,{
    apartments_total:3,apartments_submitted:1,apartments_missing:2,
    meters_total:6,meters_submitted:3,meters_missing:3,
  });
});

test('zero current is submitted; negative consumption is NOT missing data', () => {
  const rows=[meter(22,1,0,'negative_consumption'),meter(22,2,414.5,'complete')];
  const a=summarizeMonthlySubmissionCoverage(rows);
  assert.equal(a.complete,1);assert.equal(a.any,1);assert.equal(a.negative,1);
  assert.equal(a.missingCurrent,0);
  assert.equal(isMissingReadingStatus('negative_consumption'),false);
});

test('missing previous belongs on Missing Data, despite current being submitted', () => {
  const a=summarizeMonthlySubmissionCoverage([meter(4,1,8,'missing_previous')]);
  assert.equal(a.any,1);assert.equal(a.complete,1);assert.equal(a.missingCurrent,0);
  assert.equal(a.missingPrevious,1);
  assert.equal(isMissingReadingStatus('missing_previous'),true);
});

test('only the two real missing states belong on Missing Data sheet', () => {
  const statuses=['complete','missing_current','missing_previous','negative_consumption'];
  assert.deepEqual(statuses.filter(isMissingReadingStatus),['missing_current','missing_previous']);
});

test('unknown or inconsistent states are not silently interpreted', () => {
  assert.throws(()=>summarizeMonthlySubmissionCoverage([meter(1,1,1,'unknown')]),/UNKNOWN_STATUS/);
  assert.throws(()=>summarizeMonthlySubmissionCoverage([meter(1,1,null,'complete')]),/STATUS_READING_CONFLICT/);
  assert.throws(()=>summarizeMonthlySubmissionCoverage([meter(1,1,3,'missing_current')]),/STATUS_READING_CONFLICT/);
  assert.throws(()=>summarizeMonthlySubmissionCoverage([meter('',1,3)]),/MISSING_APARTMENT/);
  assert.throws(()=>summarizeMonthlySubmissionCoverage([meter(1,1,3),meter(1,1,4)]),/DUPLICATE_METER/);
});

test('API contract remains unchanged: submitted = fully submitted', () => {
  const a=summarizeMonthlySubmissionCoverage([meter(1,1,1),meter(2,1,1),meter(2,2,null,'missing_current')]);
  assert.equal(a.any,2);assert.equal(a.complete,1);
  assert.throws(()=>assertMonthlyCoverageMatchesSummary(a,{
    apartments_total:2,apartments_submitted:2,apartments_missing:1,
    meters_total:3,meters_submitted:2,meters_missing:1,
  }),/apartments_submitted/);
});

test('95/350/67 fixture matches October known aggregate without any private readings', () => {
  // 17 complete (16 x 4 meters + 1 x 1 meter) = 65 submitted.
  // 1 partial apartment has 4 meters, 2 submitted = 67.
  // 77 other apartments have 281 entirely missing meters.
  const rows=[];
  let apt=1;
  for(;apt<=16;apt++)for(let i=1;i<=4;i++)rows.push(meter(apt,i,i));
  rows.push(meter(17,1,0,'negative_consumption'));
  for(let i=1;i<=4;i++)rows.push(meter(18,i,i<=2?i:null,i<=2?'complete':'missing_current'));
  for(let k=19;k<=95;k++){
    const count=k<=68?4:3; // 50 * 4 + 27 * 3 = 281
    for(let i=1;i<=count;i++)rows.push(meter(k,i,null,'missing_current'));
  }
  const a=summarizeMonthlySubmissionCoverage(rows);
  assert.deepEqual([a.total,a.any,a.complete,a.partial,a.none,a.withMissing,a.metersTotal,a.readingsReceived,a.missingCurrent],
    [95,18,17,1,77,78,350,67,283]);
  assertMonthlyCoverageMatchesSummary(a,{
    apartments_total:95,apartments_submitted:17,apartments_missing:78,
    meters_total:350,meters_submitted:67,meters_missing:283,
  });
});

test('summary worksheet rows match explicit metrics and cannot shift counts',()=>{
  const coverage=summarizeMonthlySubmissionCoverage([meter(1,1,1),meter(2,1,0),meter(2,2,null,'missing_current')]);
  const labels={apartmentsAny:'Any',apartmentsSubmitted:'Full',apartmentsPartial:'Partial',apartmentsNone:'None',apartmentsMissing:'With missing'};
  assert.deepEqual(buildMonthlyCoverageSummaryRows(labels,coverage),[
    ['Any',2],['Full',1],['Partial',1],['None',0],['With missing',1]
  ]);
  assert.throws(()=>buildMonthlyCoverageSummaryRows({},coverage),/INVALID_SUMMARY_ROWS/);
});

test('missing worksheet excludes negative anomaly without changing it',()=>{
  const rows=[meter(22,1,99,'negative_consumption'),meter(22,2,null,'missing_current'),meter(23,1,0,'missing_previous'),meter(23,2,4)];
  const missing=selectMissingMonthlyReadingRows(rows);
  assert.deepEqual(missing.map(x=>x.status),['missing_current','missing_previous']);
  assert.equal(rows[0].status,'negative_consumption');
});
