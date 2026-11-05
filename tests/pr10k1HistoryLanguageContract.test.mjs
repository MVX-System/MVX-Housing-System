// PR-10K.1J — guard against resident History crash: ReferenceError: language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/MeterHistoryModal.jsx', import.meta.url), 'utf8');

test('MeterHistoryModal obtains locale from useTranslation before using language', () => {
  assert.match(source, /\bconst\s*\{[^}]*\blanguage\b[^}]*\}\s*=\s*useTranslation\s*\(\s*\)/s);
  assert.match(source, /\buseTranslation\s*\(/);
});
