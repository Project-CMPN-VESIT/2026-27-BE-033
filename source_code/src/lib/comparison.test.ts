import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../../app/api/comparison/route";

test("Comparison provides real candidates and scores without a database", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  const { candidates } = await response.json();
  assert.equal(candidates.length, 999);
  assert.equal(new Set(candidates.map((candidate: { id: string }) => candidate.id)).size, 999);
  assert.deepEqual(new Set(candidates.map((candidate: { state: string }) => candidate.state)),
    new Set(["Delhi", "Kerala", "Maharashtra", "Karnataka"]));
  const example = candidates.find((candidate: { id: string }) => candidate.id === "22");
  assert.ok(example, "A candidate linked from the directory is selectable");
  assert.equal(example.constituency, "New Delhi");
  assert.ok(candidates.every((candidate: { credibilityScore: number }) =>
    Number.isInteger(candidate.credibilityScore) && candidate.credibilityScore >= 0 && candidate.credibilityScore <= 100));
});
