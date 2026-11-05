// PR-10K.1K — regressions for resident ledger + History localization.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLocationName } from '../src/features/water-reporting/waterReadingLogic.js';

const form = readFileSync(new URL('../src/features/water-reporting/WaterReadingUnifiedForm.jsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/pages/ResidentWaterPage.jsx', import.meta.url), 'utf8');

test('desktop first column uses approved localized serial-number label', () => {
  assert.match(form, /<div className="mvx-water-section__columns"[^>]*>[\s\S]*?<span>\{t\.serialNumber\}<\/span>/);
  assert.doesNotMatch(form, /<span>\{t\.meter\}<\/span>/);
  assert.match(form, /serialNumber: 'Серийный номер счетчика'/);
  assert.match(form, /serialNumber: 'Skaitītāja sērijas numurs'/);
  assert.match(form, /serialNumber: 'Meter serial number'/);
});

test('PROD History modal localizes raw location without altering API data', () => {
  const modal = readFileSync(new URL('../src/components/MeterHistoryModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /localizeMeterLocation\(meter\.local_label,\s*language\)/);
  assert.match(page, /history=\{meterHistory\}/);
  assert.doesNotMatch(page, /localizedMeterHistory/);
});

for (const [language, expected] of [['ru', 'Кухня'], ['lv', 'Virtuve'], ['en', 'Kitchen']]) {
  test(`raw API Kitchen label maps to ${language} display`, () => {
    assert.equal(getLocationName({ location: 'Kitchen' }, language), expected);
  });
}

for (const [language, expected] of [['ru', 'Ванная'], ['lv', 'Vannas istaba'], ['en', 'Bathroom']]) {
  test(`raw API Bathroom label maps to ${language} display`, () => {
    assert.equal(getLocationName({ location: 'Bathroom' }, language), expected);
  });
}

test('custom user-defined location is preserved in every locale', () => {
  for (const language of ['ru', 'lv', 'en']) {
    assert.equal(getLocationName({ location: 'Место 3' }, language), 'Место 3');
  }
});
