import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { labelOf, EVENT_TYPES, EVENT_STATUS, FIT_TYPES } from "../src/lib/constants";
import { sendEmail, EMAIL_TEMPLATES } from "../src/lib/email";
import { generate, type AiTask } from "../src/lib/ai";
import { qrSvg } from "../src/lib/qr";
import { normalizePoolerUrl } from "../src/lib/db";

describe("constants.labelOf", () => {
  it("returns the label for a known key", () => {
    assert.equal(labelOf(EVENT_TYPES, "CONFERENCE"), EVENT_TYPES.CONFERENCE);
  });
  it("falls back to the key itself for unknown values", () => {
    assert.equal(labelOf(EVENT_TYPES, "MYSTERY"), "MYSTERY");
  });
  it("status maps carry label + tone", () => {
    for (const meta of Object.values(EVENT_STATUS)) {
      assert.equal(typeof meta.label, "string");
      assert.ok(meta.label.length > 0);
      assert.equal(typeof meta.tone, "string");
    }
  });
  it("FIT_TYPES covers the fits matchmaking can produce", () => {
    for (const k of ["BUYER_SELLER", "INVESTOR_FOUNDER", "PEER"]) {
      assert.ok(k in FIT_TYPES, `missing ${k}`);
    }
  });
});

describe("email", () => {
  it("mock provider reports success without sending", async () => {
    const res = await sendEmail({ to: "a@example.com", subject: "hi", text: "t" });
    assert.deepEqual(res, { ok: true, provider: "mock" });
  });
  it("accepts a recipient list", async () => {
    const res = await sendEmail({ to: ["a@example.com", "b@example.com"], subject: "hi" });
    assert.equal(res.ok, true);
  });
  it("templates interpolate name and event", () => {
    const t = EMAIL_TEMPLATES.registrationConfirmation("Ana", "DemoConf");
    assert.ok(t.subject.includes("DemoConf"));
    assert.ok(t.text.includes("Ana"));
    const m = EMAIL_TEMPLATES.meetingReminder("Ana", "Bo", "3:00 PM");
    assert.ok(m.subject.includes("Bo"));
    assert.ok(m.text.includes("3:00 PM"));
    const f = EMAIL_TEMPLATES.postEventFollowUp("Ana", "DemoConf");
    assert.ok(f.subject.includes("DemoConf"));
  });
});

describe("ai.generate (mock provider)", () => {
  const tasks: AiTask[] = [
    "event_description",
    "page_copy",
    "speaker_bio",
    "sponsor_package",
    "registration_questions",
    "match_message",
    "follow_up_email",
    "post_event_summary",
    "sponsor_roi_summary",
    "survey_insights",
  ];
  it("returns non-empty editable output for every task", async () => {
    for (const task of tasks) {
      const r = await generate(task, { name: "TestEvent" });
      assert.equal(r.task, task);
      assert.equal(r.editable, true);
      assert.equal(r.provider, "mock");
      assert.ok(r.output.length > 20, `${task} output too short`);
    }
  });
  it("interpolates the provided name", async () => {
    const r = await generate("event_description", { name: "ZebraCon" });
    assert.ok(r.output.includes("ZebraCon"));
  });
  it("falls back to a generic subject with no input", async () => {
    const r = await generate("event_description");
    assert.ok(r.output.includes("your event"));
  });
});

describe("qr.qrSvg", () => {
  it("renders a self-contained SVG", async () => {
    const svg = await qrSvg("reg-token-123");
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("</svg>"));
  });
  it("different input yields different codes", async () => {
    assert.notEqual(await qrSvg("token-a"), await qrSvg("token-b"));
  });
  it("rejects empty input", async () => {
    await assert.rejects(() => qrSvg(""));
  });
});

describe("db.normalizePoolerUrl", () => {
  const POOLER = "postgresql://user.ref:pw@aws-0-us-west-1.pooler.supabase.com:6543/postgres";
  const DIRECT = "postgresql://postgres:pw@db.ref.supabase.co:5432/postgres";

  it("forces pgbouncer + connection_limit on a pooler URL", () => {
    const out = new URL(normalizePoolerUrl(POOLER)!);
    assert.equal(out.searchParams.get("pgbouncer"), "true");
    assert.equal(out.searchParams.get("connection_limit"), "1");
  });
  it("detects the pooler by port 6543 on any host", () => {
    const out = new URL(normalizePoolerUrl("postgresql://u:p@example.com:6543/db")!);
    assert.equal(out.searchParams.get("pgbouncer"), "true");
  });
  it("leaves direct (5432) connections untouched", () => {
    assert.equal(normalizePoolerUrl(DIRECT), DIRECT);
  });
  it("respects an explicit existing pgbouncer param", () => {
    const out = new URL(normalizePoolerUrl(`${POOLER}?pgbouncer=false`)!);
    assert.equal(out.searchParams.get("pgbouncer"), "false");
  });
  it("passes through undefined", () => {
    assert.equal(normalizePoolerUrl(undefined), undefined);
  });
  it("returns unparseable strings as-is", () => {
    assert.equal(normalizePoolerUrl("not a url"), "not a url");
  });
});
