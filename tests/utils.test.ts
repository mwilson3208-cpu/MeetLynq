import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cn,
  formatMoney,
  formatDate,
  formatDateTime,
  formatTime,
  initials,
  slugify,
  parseJson,
  pct,
} from "../src/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    assert.equal(cn("a", "b"), "a b");
  });
  it("drops falsy values", () => {
    assert.equal(cn("a", false && "b", null, undefined, "c"), "a c");
  });
  it("resolves tailwind conflicts (last wins)", () => {
    assert.equal(cn("p-2", "p-4"), "p-4");
    assert.equal(cn("text-red-500", "text-blue-500"), "text-blue-500");
  });
});

describe("formatMoney", () => {
  it("formats whole dollars without decimals", () => {
    assert.equal(formatMoney(500), "$5");
    assert.equal(formatMoney(129900), "$1,299");
  });
  it("formats fractional dollars with 2 decimals", () => {
    assert.equal(formatMoney(123456), "$1,234.56");
    assert.equal(formatMoney(1), "$0.01");
  });
  it("formats zero", () => {
    assert.equal(formatMoney(0), "$0");
  });
  it("formats negative amounts", () => {
    assert.equal(formatMoney(-500), "-$5");
  });
  it("supports other currencies", () => {
    assert.equal(formatMoney(999, "EUR"), "€9.99");
  });
});

describe("formatDate / formatDateTime / formatTime", () => {
  const d = new Date("2026-03-05T14:30:00Z"); // tests run with TZ=UTC

  it("formats a Date", () => {
    assert.equal(formatDate(d), "Mar 5, 2026");
  });
  it("accepts an ISO string", () => {
    assert.equal(formatDate("2026-03-05T14:30:00Z"), "Mar 5, 2026");
  });
  it("honors custom options", () => {
    assert.equal(formatDate(d, { year: "numeric" }), "2026");
  });
  it("returns em-dash for null/undefined", () => {
    assert.equal(formatDate(null), "—");
    assert.equal(formatDate(undefined), "—");
    assert.equal(formatDateTime(null), "—");
    assert.equal(formatTime(undefined), "—");
  });
  it("formats date-time and time", () => {
    assert.equal(formatDateTime(d), "Mar 5, 2:30 PM");
    assert.equal(formatTime(d), "2:30 PM");
  });
});

describe("initials", () => {
  it("takes first letters of the first two words", () => {
    assert.equal(initials("Ada Lovelace"), "AL");
    assert.equal(initials("Grace Brewster Murray Hopper"), "GB");
  });
  it("handles a single name", () => {
    assert.equal(initials("Madonna"), "M");
  });
  it("handles empty string", () => {
    assert.equal(initials(""), "");
  });
  it("ignores extra whitespace", () => {
    assert.equal(initials("  ada   lovelace  "), "AL");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });
  it("strips special characters", () => {
    assert.equal(slugify("GrowthScale Summit 2026!"), "growthscale-summit-2026");
  });
  it("collapses repeated separators", () => {
    assert.equal(slugify("a   b---c"), "a-b-c");
  });
  it("strips leading/trailing dashes", () => {
    assert.equal(slugify("--Weird__Name--"), "weirdname");
    assert.equal(slugify("!!!"), "");
  });
  it("returns empty string for empty input", () => {
    assert.equal(slugify(""), "");
  });
  it("caps length at 60 chars without a trailing dash", () => {
    const out = slugify("word ".repeat(30));
    assert.ok(out.length <= 60);
    assert.ok(!out.endsWith("-"));
  });
});

describe("parseJson", () => {
  it("parses valid JSON", () => {
    assert.deepEqual(parseJson('{"a":1}', {}), { a: 1 });
    assert.deepEqual(parseJson("[1,2]", []), [1, 2]);
  });
  it("returns fallback for invalid JSON", () => {
    assert.deepEqual(parseJson("not json", { ok: true }), { ok: true });
  });
  it("returns fallback for null/undefined/empty", () => {
    assert.deepEqual(parseJson(null, [1]), [1]);
    assert.deepEqual(parseJson(undefined, "x"), "x");
    assert.deepEqual(parseJson("", 7), 7);
  });
});

describe("pct", () => {
  it("computes rounded percentages", () => {
    assert.equal(pct(1, 3), 33);
    assert.equal(pct(2, 3), 67);
    assert.equal(pct(5, 10), 50);
  });
  it("returns 0 when the whole is 0 (no divide-by-zero)", () => {
    assert.equal(pct(5, 0), 0);
  });
  it("returns 0 for a 0 part", () => {
    assert.equal(pct(0, 10), 0);
  });
  it("can exceed 100 (overcapacity)", () => {
    assert.equal(pct(15, 10), 150);
  });
});
