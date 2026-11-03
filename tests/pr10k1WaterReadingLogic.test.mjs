import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCubicMetres, formatCubicMetres, meterStatus,
  calculateFormState, buildSubmission, groupMetersByLocation, getLocationName,
} from '../src/features/water-reporting/waterReadingLogic.js';

const meters = [
  { id: '1', location: 'bathroom', kind: 'cold', previous: '125.420' },
  { id: '2', location: 'bathroom', kind: 'hot', previous: '62.115' },
  { id: '3', location: 'kitchen', kind: 'cold', previous: '43.760' },
  { id: '4', location: 'kitchen', kind: 'hot', previous: '28.305' },
];

test('locale comma and dot decimal inputs are parsed exactly', () => {
  assert.equal(parseCubicMetres('126,510'), 126510);
  assert.equal(parseCubicMetres('126.510'), 126510);
  assert.equal(parseCubicMetres('126'), 126000);
  assert.equal(parseCubicMetres(' 126,5 '), 126500);
  assert.equal(formatCubicMetres(90, 'ru'), '0,090');
  assert.equal(formatCubicMetres(90, 'en'), '0.090');
});

test('reject missing, malformed, negative, and over-precise values', () => {
  for (const value of ['', 'a', '-1', '1,2345', '1.2.3', '1e5', 'Infinity', null]) {
    assert.equal(parseCubicMetres(value), null, String(value));
  }
});

test('each meter consumption is updated from its own input', () => {
  const state = meterStatus(meters[0], '126,510', false);
  assert.equal(state.consumption, 1090);
  assert.equal(state.ready, true);
});

test('reading below previous is rejected', () => {
  const state = meterStatus(meters[0], '125,419', false);
  assert.equal(state.ready, false);
  assert.equal(state.error, 'below_previous');
});

test('leave unchanged uses previous and zero consumption, independent of stored draft', () => {
  const state = meterStatus(meters[0], '777,777', true);
  assert.equal(state.current, 125420);
  assert.equal(state.consumption, 0);
  assert.equal(state.ready, true);
});

test('cannot leave unchanged if no known previous reading', () => {
  const state = meterStatus({ id: 'new', previous: null }, '12,000', true);
  assert.equal(state.ready, false);
  assert.equal(state.error, 'no_previous');
});

test('total consumption sums only ready and known-baseline meters', () => {
  const state = calculateFormState(meters, {
    '1': '126,510', '2': '63,220', '3': '44,000', '4': '29,110',
  }, {});
  assert.equal(state.canSubmit, true);
  assert.equal(state.completed, 4);
  assert.equal(state.totalConsumption, 1090 + 1105 + 240 + 805);
  assert.equal(state.totalConsumption, 3240);
});

test('one incomplete meter makes the batch non-submittable', () => {
  const state = calculateFormState(meters, { '1': '126,510', '2': '63,220', '3': '44,000' }, {});
  assert.equal(state.canSubmit, false);
  assert.equal(state.completed, 3);
  assert.throws(() => buildSubmission({ meters, drafts: {}, unchanged: {}, reportingPeriodId: 22 }));
});

test('payload contains all readings and no user-supplied timestamps', () => {
  const payload = buildSubmission({
    meters,
    reportingPeriodId: 22,
    drafts: { '1': '126,510', '2': '63,220', '3': '44,000', '4': '29,110' },
    unchanged: { '1': true },
  });
  assert.equal(payload.reportingPeriodId, 22);
  assert.equal(payload.readings.length, 4);
  assert.deepEqual(payload.readings[0], { meterId: '1', value: '125.420', unchanged: true, expectedPrevious: 125420 });
  assert.equal(JSON.stringify(payload).includes('submitted_at'), false);
  assert.equal(JSON.stringify(payload).includes('reading_date'), false);
});

test('duplicate IDs and absent period are rejected', () => {
  const drafts = { '1': '130', '2': '70', '3': '50', '4': '30' };
  assert.throws(() => buildSubmission({ meters, drafts, unchanged: {}, reportingPeriodId: null }));
  assert.throws(() => buildSubmission({ meters: [...meters, meters[0]], drafts, unchanged: {}, reportingPeriodId: 22 }));
});

test('location grouping keeps short localized labels, never infers from riser', () => {
  assert.equal(getLocationName({ location: 'bathroom', riser: 'CW-E9-1R-K' }, 'ru'), 'Ванная');
  assert.equal(getLocationName({ location: 'kitchen' }, 'lv'), 'Virtuve');
  assert.equal(getLocationName({ location: '', riser: 'CW-E9-1R-K' }, 'ru'), 'Расположение не указано');
  assert.deepEqual(groupMetersByLocation([meters[2], meters[1], meters[0]], 'ru').map(g => g.name), ['Ванная', 'Кухня']);
});

test('new meter without baseline can be submitted, but unknown usage remains unknown', () => {
  const meter = { id: 'x', previous: null };
  const state = calculateFormState([meter], { x: '15,250' }, {});
  assert.equal(state.canSubmit, true);
  assert.equal(state.calculated, 0);
  assert.equal(state.states.x.consumption, null);
});
