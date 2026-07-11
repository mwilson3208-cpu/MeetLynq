"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { parseJson } from "@/lib/utils";
import { scorePair } from "@/lib/matchmaking";

type State = { ok?: boolean; error?: string };

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function revalidate(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}/matchmaking`);
  revalidatePath("/portal");
}

interface Rules {
  minScore?: number;
  allowBuyerSeller?: boolean;
  allowInvestorFounder?: boolean;
}

/** Recompute match scores for every participant pair, honoring the min-score
 *  rule and preserving organizer-overridden (pinned) matches. */
export async function runMatchmaking(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const rules = parseJson<Rules>(event.matchRules, {});
  const minScore = typeof rules.minScore === "number" ? rules.minScore : 40;

  const participants = await db.participant.findMany({
    where: { eventId: event.id },
    take: 300,
    select: { id: true, name: true, interestTags: true, lookingFor: true, offering: true, industry: true, goals: true, intentScore: true },
  });

  const overridden = await db.matchScore.findMany({ where: { eventId: event.id, overridden: true } });
  const keep = new Set(overridden.map((m) => pairKey(m.participantAId, m.participantBId)));

  await db.matchScore.deleteMany({ where: { eventId: event.id, overridden: false } });

  // Build all rows in memory, then insert in a single createMany instead of
  // one INSERT per pair inside a transaction (far fewer round trips for the
  // O(n²) pairing — up to ~45k candidate pairs at the 300-participant cap).
  const rows = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      let a = participants[i];
      let b = participants[j];
      if (a.id > b.id) [a, b] = [b, a]; // canonical order for the unique pair
      if (keep.has(pairKey(a.id, b.id))) continue;
      const r = scorePair(a, b);
      if (r.score < minScore) continue;
      rows.push({
        eventId: event.id,
        participantAId: a.id,
        participantBId: b.id,
        score: r.score,
        reason: r.reason,
        mutualInterests: JSON.stringify(r.mutualInterests),
        fitType: r.fitType,
        suggestedMessage: r.suggestedMessage,
        suggestedGoal: r.suggestedGoal,
      });
    }
  }
  if (rows.length) await db.matchScore.createMany({ data: rows });
  revalidate(event.id);
}

/** Update the organizer's matchmaking rules (min score + allowed fit types). */
export async function updateMatchRules(_prev: State | null, fd: FormData): Promise<State> {
  const event = await getEventOr404(str(fd, "eventId"));
  const minRaw = Number.parseInt(str(fd, "minScore"), 10);
  const minScore = Number.isFinite(minRaw) ? Math.max(0, Math.min(100, minRaw)) : 40;
  const rules: Rules = {
    minScore,
    allowBuyerSeller: fd.get("allowBuyerSeller") === "on",
    allowInvestorFounder: fd.get("allowInvestorFounder") === "on",
  };
  await db.event.update({ where: { id: event.id }, data: { matchRules: JSON.stringify(rules) } });
  revalidate(event.id);
  return { ok: true };
}

/** Pin/unpin a match so it survives a re-run (manual override). */
export async function toggleMatchOverride(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  const match = await db.matchScore.findFirst({ where: { id: str(fd, "id"), eventId: event.id } });
  if (!match) return;
  await db.matchScore.update({ where: { id: match.id }, data: { overridden: !match.overridden } });
  revalidate(event.id);
}

/** Remove a match suggestion. */
export async function deleteMatch(fd: FormData): Promise<void> {
  const event = await getEventOr404(str(fd, "eventId"));
  await db.matchScore.deleteMany({ where: { id: str(fd, "id"), eventId: event.id } });
  revalidate(event.id);
}
