import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPreviousReadingDate } from '../src/features/water-reporting/previousReadingDate.js';

test('formats UTC submitted_at in Europe/Riga', () => {
  assert.equal(formatPreviousReadingDate('2026-11-04T13:05:00.000Z'), '04.11.2026');
});
test('moves late-night UTC submission to next Riga calendar day', () => {
  assert.equal(formatPreviousReadingDate('2026-11-04T22:30:00.000Z'), '05.11.2026');
});
test('handles summer time in Europe/Riga', () => {
  assert.equal(formatPreviousReadingDate('2026-06-01T21:30:00Z'), '02.06.2026');
});
test('accepts SQLite UTC timestamp', () => {
  assert.equal(formatPreviousReadingDate('2026-11-01 17:24:00'), '01.11.2026');
});
test('honors explicitly supplied timezone offset', () => {
  assert.equal(formatPreviousReadingDate('2026-11-04T23:30:00+02:00'), '04.11.2026');
});
test('does not invent dates for unknown or invalid submission timestamps', () => {
  for (const value of [null, '', undefined, '2026-11-01', 'invalid', '2026-99-99T99:99:99Z']) {
    assert.equal(formatPreviousReadingDate(value), '—');
  }
});
