import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNumberRanges, includesExactNumber, matchesSection, matchesFloor, matchesApartment, matchesLocationFilters} from '../src/utils/mvxSmartNumberFilter.js';

test('free text empty means no restriction',()=>{assert.equal(parseNumberRanges(' ').active,false)});
test('section ranges and lists merged',()=>{assert.deepEqual(parseNumberRanges('2, 3-5, 9').ranges,[[2,5],[9,9]])});
test('unicode dashes and whitespace around hyphens',()=>{assert.deepEqual(parseNumberRanges('2; 4 – 6').ranges,[[2,2],[4,6]])});
test('ranges inclusive',()=>{const s=parseNumberRanges('20-22');for(let i=20;i<=22;i++)assert.equal(includesExactNumber(s,i),true);assert.equal(includesExactNumber(s,23),false)});
test('adjacent and overlapping are merged',()=>{assert.deepEqual(parseNumberRanges('4-6, 5, 7-8').ranges,[[4,8]])});
test('reject reversed ranges',()=>{assert.match(parseNumberRanges('7-3').error,/обратном/)});
test('reject SQL, wildcards, words',()=>{for(const x of ['22*','22 OR 1=1','abc'])assert.ok(parseNumberRanges(x).error)});
test('exact apartment 22 does not match 122 or 220',()=>{const s=parseNumberRanges('22');assert.equal(matchesApartment(s,'22'),true);assert.equal(matchesApartment(s,'122'),false);assert.equal(matchesApartment(s,'220'),false)});
test('combined apartments support either member',()=>{const s=parseNumberRanges('29');assert.equal(matchesApartment(s,'28-29'),true);assert.equal(matchesApartment(s,'28/29'),true);assert.equal(matchesApartment(s,'129-130'),false)});
test('section E3 and numeric 3 both match',()=>{const s=parseNumberRanges('3');assert.equal(matchesSection(s,'E3'),true);assert.equal(matchesSection(s,'3'),true);assert.equal(matchesSection(s,'13'),false)});
test('floor numeric equality',()=>{const s=parseNumberRanges('2');assert.equal(matchesFloor(s,'2'),true);assert.equal(matchesFloor(s,'12'),false)});
test('filters AND between fields',()=>{const s={section:parseNumberRanges('2'),floor:parseNumberRanges('3-5'),apartment:parseNumberRanges('16,20-22')};assert.equal(matchesLocationFilters({apartment_section:'2',apartment_floor:'4',apartment_number:'21'},s),true);assert.equal(matchesLocationFilters({apartment_section:'3',apartment_floor:'4',apartment_number:'21'},s),false);assert.equal(matchesLocationFilters({apartment_section:'2',apartment_floor:'4',apartment_number:'121'},s),false)});
test('no 10000 element allocation for long range',()=>{assert.deepEqual(parseNumberRanges('1-1000000').ranges,[[1,1000000]])});
test('do not match missing section/floor if filter active',()=>{const s=parseNumberRanges('2');assert.equal(matchesSection(s,null),false);assert.equal(matchesFloor(s,undefined),false)});

test('filter input with a number does not accidentally match partial tokens',()=>{
  const s=parseNumberRanges('2');
  for(const value of ['12','20','22','102']) assert.equal(matchesFloor(s,value),false);
});
test('a merged 67-69 apartment matches the two real units, not 68',()=>{
  assert.equal(matchesApartment(parseNumberRanges('67'),'67-69'),true);
  assert.equal(matchesApartment(parseNumberRanges('69'),'67-69'),true);
  assert.equal(matchesApartment(parseNumberRanges('68'),'67-69'),false);
});
test('plain universal search remains independent of numeric filters',()=>{
  assert.equal(matchesLocationFilters({apartment_section:2,apartment_floor:3,apartment_number:'22'}, {
    section:parseNumberRanges('2'),floor:parseNumberRanges('3'),apartment:parseNumberRanges('22')
  }),true);
});
test('invalid numeric syntax must fail closed, not return everything',()=>{
  const bad=parseNumberRanges('22+');
  assert.ok(bad.error);
  assert.equal(matchesApartment(bad,'22'),false);
});
test('zero floor can be matched exactly',()=>{
 assert.equal(matchesFloor(parseNumberRanges('0'),0),true);
 assert.equal(matchesFloor(parseNumberRanges('0'),1),false);
});
