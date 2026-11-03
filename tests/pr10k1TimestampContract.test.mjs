import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const start = worker.indexOf('// PR-10K.1 — RESIDENT WATER BATCH SUBMISSION (TEST)');
const end = worker.indexOf('// SUBMIT WATER READING', start);

// Static regression guard; this does not replace testing against actual TEST D1.
test('PR-10K.1 batch reading_date equals submitted_at', () => {
  assert.ok(start >= 0 && end > start, 'batch route must exist');
  const route = worker.slice(start, end);
  assert.match(route, /const nowIso = new Date\(\)\.toISOString\(\);/);
  assert.match(route, /const readingDate = nowIso;/);
  assert.match(route, /readingDate, user\.user_id, periodId, nowIso/);
  assert.doesNotMatch(route, /\$\{parts\.year\}/);
});
