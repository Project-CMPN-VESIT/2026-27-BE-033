import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../../app/api/dashboard/route';
import records from './data/candidates_clean.json';
const get = async (query = '') => (await GET(new Request(`http://localhost/api/dashboard${query}`))).json();

test('Dashboard summary reconciles with the entire sheet', async () => {
  const result = await get();
  assert.equal(result.summary.candidates, 999);
  assert.equal(result.summary.declaredCases, 1353);
  assert.equal(result.summary.constituencies, new Set(records.map(c => c.constituency)).size);
  assert.equal(result.summary.parties, new Set(records.map(c => c.party)).size);
  assert.equal(result.summary.noCases + result.summary.withCases, 999);
  assert.equal(result.candidates.length, 9);
});
test('Directory search and constituency filters combine', async () => {
  const result = await get('?q=BJP&constituency=New%20Delhi');
  assert.equal(result.total, records.filter(c => c.party === 'BJP' && c.constituency === 'New Delhi').length);
  assert.ok(result.candidates.every((c: any) => c.party === 'BJP' && c.constituency === 'New Delhi'));
});
test('Quick filters use exact rupee and age values', async () => {
  assert.equal((await get('?filter=no-cases')).total, 745);
  assert.equal((await get('?filter=crorepati')).total, 373);
  assert.equal((await get('?filter=under-40')).total, 228);
});
test('Asset sorting returns the actual highest-assets candidate', async () => {
  const result = await get('?filter=highest-assets');
  assert.equal(result.candidates[0].id, '283');
  assert.ok(result.candidates.every((c: any, i: number) => i === 0 || result.candidates[i - 1].assets >= c.assets));
});
test('Pagination has no overlaps and clamps invalid pages', async () => {
  const first = await get(), second = await get('?page=2');
  assert.ok(second.candidates.every((c: any) => !first.candidates.some((a: any) => a.id === c.id)));
  assert.equal((await get('?page=-10')).page, 1);
  const last = await get('?page=99999');
  assert.equal(last.page, last.pages);
});
test('An empty search returns an honest empty state', async () => {
  const result = await get('?q=NoSuchCandidateXyz');
  assert.equal(result.total, 0);
  assert.deepEqual(result.candidates, []);
});
