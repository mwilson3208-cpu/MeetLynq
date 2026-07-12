import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isFieldType,
  isChoiceType,
  parseOptions,
  normalizeOptions,
  fieldInputName,
  collectFieldAnswers,
  parseSuggestedQuestions,
  type FieldDTO,
} from "../src/lib/registration-fields";

describe("isFieldType / isChoiceType", () => {
  it("accepts known types", () => {
    assert.equal(isFieldType("TEXT"), true);
    assert.equal(isFieldType("MULTI_CHOICE"), true);
  });
  it("rejects unknown types", () => {
    assert.equal(isFieldType("DROPDOWN"), false);
    assert.equal(isFieldType(""), false);
  });
  it("identifies choice types", () => {
    assert.equal(isChoiceType("SINGLE_CHOICE"), true);
    assert.equal(isChoiceType("MULTI_CHOICE"), true);
    assert.equal(isChoiceType("TEXT"), false);
  });
});

describe("parseOptions", () => {
  it("parses a JSON array of strings", () => {
    assert.deepEqual(parseOptions('["A","B"]'), ["A", "B"]);
  });
  it("returns [] for null/empty/invalid", () => {
    assert.deepEqual(parseOptions(null), []);
    assert.deepEqual(parseOptions(""), []);
    assert.deepEqual(parseOptions("not json"), []);
    assert.deepEqual(parseOptions('{"a":1}'), []);
  });
  it("drops blank entries and coerces to strings", () => {
    assert.deepEqual(parseOptions('["A","","  ",1]'), ["A", "1"]);
  });
});

describe("normalizeOptions", () => {
  it("returns null for non-choice types", () => {
    assert.equal(normalizeOptions("TEXT", "a,b"), null);
  });
  it("splits on commas and newlines, trims, de-dupes case-insensitively", () => {
    assert.deepEqual(normalizeOptions("SINGLE_CHOICE", "Founder\nInvestor, founder ,  Operator"), [
      "Founder",
      "Investor",
      "Operator",
    ]);
  });
  it("drops empties and caps at 25 options", () => {
    const many = Array.from({ length: 40 }, (_, i) => `opt${i}`).join(",");
    assert.equal(normalizeOptions("MULTI_CHOICE", many)!.length, 25);
    assert.deepEqual(normalizeOptions("MULTI_CHOICE", " , , "), []);
  });
});

describe("fieldInputName", () => {
  it("prefixes the field id", () => {
    assert.equal(fieldInputName("abc"), "custom_abc");
  });
});

describe("parseSuggestedQuestions", () => {
  const sample = `Suggested questions:
• What is your primary goal for attending?
• Which best describes your role? (Buyer / Seller / Investor)
- What are you looking for at this event?
1. What topics matter most to you?`;

  it("skips the header and parses each bulleted line", () => {
    const out = parseSuggestedQuestions(sample);
    assert.equal(out.length, 4);
    assert.equal(out[0].label, "What is your primary goal for attending?");
  });
  it("turns a parenthetical list into a single-choice field", () => {
    const out = parseSuggestedQuestions(sample);
    const role = out.find((o) => o.label.startsWith("Which best describes"))!;
    assert.equal(role.type, "SINGLE_CHOICE");
    assert.deepEqual(role.options, ["Buyer", "Seller", "Investor"]);
  });
  it("defaults open questions to long text with no options", () => {
    const out = parseSuggestedQuestions(sample);
    assert.equal(out[0].type, "LONG_TEXT");
    assert.deepEqual(out[0].options, []);
  });
  it("de-dupes by label and handles empty input", () => {
    assert.deepEqual(parseSuggestedQuestions(""), []);
    const dup = parseSuggestedQuestions("• Same?\n• Same?");
    assert.equal(dup.length, 1);
  });
});

describe("collectFieldAnswers", () => {
  const text: FieldDTO = { id: "1", label: "Company", type: "TEXT", required: false, options: [] };
  const reqText: FieldDTO = { id: "2", label: "Goal", type: "LONG_TEXT", required: true, options: [] };
  const single: FieldDTO = { id: "3", label: "Role", type: "SINGLE_CHOICE", required: true, options: ["CEO", "Investor"] };
  const multi: FieldDTO = { id: "4", label: "Topics", type: "MULTI_CHOICE", required: false, options: ["AI", "GTM"] };

  function fd(entries: [string, string][]) {
    const f = new FormData();
    for (const [k, v] of entries) f.append(k, v);
    return f;
  }

  it("collects answers keyed by label", () => {
    const { answers, error } = collectFieldAnswers([text, reqText], fd([
      ["custom_1", "Acme"],
      ["custom_2", "Meet investors"],
    ]));
    assert.equal(error, undefined);
    assert.deepEqual(answers, { Company: "Acme", Goal: "Meet investors" });
  });

  it("errors on a missing required field", () => {
    const { error } = collectFieldAnswers([reqText], fd([]));
    assert.match(error!, /Goal/);
  });

  it("omits empty optional fields", () => {
    const { answers } = collectFieldAnswers([text], fd([["custom_1", "   "]]));
    assert.deepEqual(answers, {});
  });

  it("rejects a single-choice value outside the allowed options", () => {
    const { error } = collectFieldAnswers([single], fd([["custom_3", "Hacker"]]));
    assert.match(error!, /Role/); // invalid value dropped -> required now unmet
  });

  it("accepts a valid single-choice value", () => {
    const { answers } = collectFieldAnswers([single], fd([["custom_3", "Investor"]]));
    assert.deepEqual(answers, { Role: "Investor" });
  });

  it("joins multi-choice selections and filters invalid ones", () => {
    const { answers } = collectFieldAnswers([multi], fd([
      ["custom_4", "AI"],
      ["custom_4", "Nope"],
      ["custom_4", "GTM"],
    ]));
    assert.deepEqual(answers, { Topics: "AI, GTM" });
  });
});
