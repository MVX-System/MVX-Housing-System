// PR-10K.1P.2 — PROD-specific invariants, no network/DB writes
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/hooks/useWater.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/ResidentWaterPage.jsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/components/MeterHistoryModal.jsx', import.meta.url), 'utf8');
test('PROD maintenance guard and scheduler preserved', () => {
  assert.match(worker, /SystemOperationsControl\.getState\(env\)/);
  assert.match(worker, /maintenance_enabled/);
  assert.match(worker, /ensureAutomaticWaterReportingPeriods/);
});
test('PROD admin monthly report and meter source slot preserved', () => {
  assert.match(worker, /admin\/water-monthly-report-periods/);
  assert.match(worker, /source_slot/);
  assert.match(hook, /loadAdminMonthlyReportPeriods/);
  assert.match(hook, /adminMonthlyReportPeriods/);
  assert.match(hook, /source_slot:\s*sourceSlot/);
});
test('PROD stable date display and Russian plurality preserved', () => {
  assert.match(page, /formatMvxDateTime\(value\)/);
  assert.match(page, /meterCount\.few/);
});
test('PROD history localization stays in existing modal', () => {
  assert.match(modal, /localizeMeterLocation\(meter\.local_label,\s*language\)/);
  assert.match(modal, /const\s*\{\s*t,\s*language,\s*\}\s*=\s*useTranslation\(\)/);
  assert.match(page, /history=\{meterHistory\}/);
});
test('period-aware API, active status and prior baseline present', () => {
  const start = worker.indexOf('Router.register("GET", "/api/my-water-meters"');
  const end = worker.indexOf('// MY WATER METER HISTORY', start);
  assert.ok(start >= 0 && end > start);
  const get = worker.slice(start, end);
  assert.match(get, /wm\.active AS active/);
  assert.match(get, /current_period_reading_value/);
  assert.match(get, /prior_period_reading_value/);
  assert.match(hook, /reportingPeriodId = null/);
});
test('only one batch endpoint and original single route remain', () => {
  assert.equal(worker.split('"/api/submit-water-readings-batch"').length - 1, 1);
  assert.equal(worker.split('"/api/submit-water-reading"').length - 1, 1);
  assert.match(worker, /if \(syncResult\?\.skipped\)/);
  assert.match(worker, /pending_meters/);
  assert.match(worker, /v\.input_count = v\.expected_count/);
});
test('unified resident UI and partial submission are connected', () => {
  assert.match(page, /<WaterReadingUnifiedForm/);
  assert.doesNotMatch(page, /<WaterCard/);
  assert.match(page, /await loadWaterReportingPeriod\(\)/);
  assert.match(page, /current_period_reading_value/);
  assert.match(hook, /const submitBatchReadings = async/);
});
