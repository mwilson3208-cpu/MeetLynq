import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toCsv, csvFilename } from "../src/lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF", () => {
    assert.equal(toCsv(["a", "b"], [["1", "2"]]), "a,b\r\n1,2");
  });
  it("quotes fields containing commas", () => {
    assert.equal(toCsv(["v"], [["x,y"]]), 'v\r\n"x,y"');
  });
  it("doubles embedded quotes", () => {
    assert.equal(toCsv(["v"], [['He said "hi"']]), 'v\r\n"He said ""hi"""');
  });
  it("quotes fields containing newlines", () => {
    assert.equal(toCsv(["v"], [["line1\nline2"]]), 'v\r\n"line1\nline2"');
  });
  it("renders null/undefined as empty fields", () => {
    assert.equal(toCsv(["a", "b", "c"], [[null, undefined, "x"]]), "a,b,c\r\n,,x");
  });
  it("stringifies numbers and booleans", () => {
    assert.equal(toCsv(["n", "b"], [[42, true]]), "n,b\r\n42,true");
  });
  it("quotes headers needing escapes too", () => {
    assert.equal(toCsv(['say "a", b'], []), '"say ""a"", b"');
  });
  it("handles zero rows", () => {
    assert.equal(toCsv(["only", "headers"], []), "only,headers");
  });
});

describe("csvFilename", () => {
  it("slugs the base name", () => {
    assert.equal(csvFilename("My Event: 2026!"), "my-event-2026.csv");
  });
  it("trims stray separators", () => {
    assert.equal(csvFilename("--x--"), "x.csv");
  });
  it("falls back to export.csv for unusable names", () => {
    assert.equal(csvFilename("***"), "export.csv");
    assert.equal(csvFilename(""), "export.csv");
  });
});
