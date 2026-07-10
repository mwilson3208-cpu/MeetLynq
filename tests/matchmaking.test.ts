import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scorePair, type MatchInput } from "../src/lib/matchmaking";

function person(overrides: Partial<MatchInput> = {}): MatchInput {
  return {
    id: "p1",
    name: "Test Person",
    interestTags: "[]",
    lookingFor: null,
    offering: null,
    industry: null,
    goals: null,
    intentScore: 0,
    ...overrides,
  };
}

describe("scorePair", () => {
  it("scores two empty profiles at 0 with PEER fit and a fallback reason", () => {
    const r = scorePair(person({ name: "Ana Ade" }), person({ id: "p2", name: "Bo Beck" }));
    assert.equal(r.score, 0);
    assert.equal(r.fitType, "PEER");
    assert.equal(r.reason, "Complementary profiles and event goals.");
    assert.deepEqual(r.mutualInterests, []);
  });

  it("scores a strongly complementary pair high with BUYER_SELLER fit", () => {
    const a = person({
      id: "a",
      name: "Ana Ade",
      interestTags: '["AI"]',
      lookingFor: "enterprise customers",
      offering: "growth playbooks",
      industry: "SaaS",
      goals: "find partners",
      intentScore: 80,
    });
    const b = person({
      id: "b",
      name: "Bo Beck",
      interestTags: '["ai","Sales"]',
      lookingFor: "growth marketing",
      offering: "enterprise platform",
      industry: "SaaS",
      goals: "meet partners",
      intentScore: 60,
    });
    const r = scorePair(a, b);
    // 20 (1 mutual) + 25 + 25 (both directions) + 10 (industry) + 8 (goals) + 7 (intent) = 95
    assert.equal(r.score, 95);
    assert.equal(r.fitType, "BUYER_SELLER");
    assert.deepEqual(r.mutualInterests, ["AI"]); // original casing from a
    assert.ok(r.reason.includes("shared interest in ai"));
    assert.ok(r.suggestedMessage.includes("Bo")); // addressed to b's first name
    assert.equal(r.suggestedGoal, "Explore a pilot or partnership");
  });

  it("caps the shared-interest contribution at 40", () => {
    const tags = '["a1","b2","c3","d4"]';
    const r = scorePair(
      person({ id: "a", name: "A A", interestTags: tags }),
      person({ id: "b", name: "B B", interestTags: tags })
    );
    assert.equal(r.score, 40);
  });

  it("clamps the total score at 100", () => {
    const a = person({
      id: "a",
      name: "A A",
      interestTags: '["x1","x2","x3"]',
      lookingFor: "widgets things",
      offering: "gadget supply",
      industry: "Hardware",
      goals: "close partnerships",
      intentScore: 100,
    });
    const b = person({
      id: "b",
      name: "B B",
      interestTags: '["x1","x2","x3"]',
      lookingFor: "gadget supply",
      offering: "widgets things",
      industry: "Hardware",
      goals: "close partnerships",
      intentScore: 100,
    });
    const r = scorePair(a, b);
    assert.equal(r.score, 100);
  });

  it("infers INVESTOR_FOUNDER when both sides show investment signals", () => {
    const a = person({ id: "a", name: "A A", lookingFor: "seed funding raise" });
    const b = person({ id: "b", name: "B B", offering: "we invest seed capital" });
    const r = scorePair(a, b);
    assert.equal(r.fitType, "INVESTOR_FOUNDER");
    assert.equal(r.suggestedGoal, "Discuss investment or fundraising");
  });

  it("treats invalid interestTags JSON as no interests instead of throwing", () => {
    const r = scorePair(
      person({ id: "a", name: "A A", interestTags: "not-json" }),
      person({ id: "b", name: "B B", interestTags: '["ai"]' })
    );
    assert.equal(r.score, 0);
    assert.deepEqual(r.mutualInterests, []);
  });

  it("gives no complementary credit for short/stop words", () => {
    // every word is <= 3 chars, so overlap detection ignores them
    const r = scorePair(
      person({ id: "a", name: "A A", lookingFor: "a to be" }),
      person({ id: "b", name: "B B", offering: "be a to" })
    );
    assert.equal(r.score, 0);
    assert.equal(r.fitType, "PEER");
  });

  it("adds the industry bonus only on exact match", () => {
    const same = scorePair(
      person({ id: "a", name: "A A", industry: "Fintech" }),
      person({ id: "b", name: "B B", industry: "Fintech" })
    );
    const diff = scorePair(
      person({ id: "a", name: "A A", industry: "Fintech" }),
      person({ id: "b", name: "B B", industry: "fintech" })
    );
    assert.equal(same.score, 10);
    assert.equal(diff.score, 0);
  });

  it("uses the mutual-interest opener when interests overlap", () => {
    const r = scorePair(
      person({ id: "a", name: "Ana Ade", interestTags: '["Fundraising"]' }),
      person({ id: "b", name: "Bo Beck", interestTags: '["fundraising"]' })
    );
    assert.ok(r.suggestedMessage.includes("fundraising"));
    assert.ok(r.suggestedMessage.startsWith("Hi Bo"));
  });
});
