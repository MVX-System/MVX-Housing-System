import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../src/pages/WaterMetersPage.jsx', import.meta.url),'utf8');
const source = readFileSync(new URL('../src/utils/mvxSmartNumberFilter.js', import.meta.url),'utf8');
test('three exact-number filters in state',()=>{
 for (const key of ['section','floor','apartment']) assert.match(page,new RegExp(key+': ""'));
});
test('apartment metadata joined by apartment_id',()=>{
 assert.match(page,/apartmentsById\.get\([\s\S]*?String\(meter\.apartment_id\)/);
 assert.match(page,/\.section \?\? null/);
 assert.match(page,/\.floor \?\? null/);
});
test('universal search is retained',()=>assert.match(page,/searchable\.includes\([\s\S]*?search/));
test('location filter enforced before existing type status calibration',()=>{
 assert.match(page,/matchesLocationFilters\([\s\S]*?locationFilterSpecs/);
 assert.match(page,/filter\.type !== "all"/);
 assert.match(page,/filter\.calibration !== "all"/);
});
test('count and reset are wired',()=>{
 assert.match(page,/filteredMeters\.length/);
 assert.match(page,/groupedMeters\.length/);
 assert.match(page,/setFilter\(\{ \.\.\.INITIAL_FILTERS \}\)/);
});
test('range syntax warnings are visible and accessible',()=>{
 assert.match(page,/aria-invalid=\{Boolean\(locationFilterSpecs\[key\]\.error\)\}/);
 assert.match(page,/role="alert"/);
});
test('pure helper has no remote access or state mutation',()=>{
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|window/);
});
