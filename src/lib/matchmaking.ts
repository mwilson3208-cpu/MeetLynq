import { parseJson } from "./utils";
import { FIT_TYPES } from "./constants";

// Deterministic matchmaking scorer. Produces a 0–100 score plus a human reason,
// mutual interests, an inferred fit type, and suggested opener/goal — the same
// shape the Matchmaking dashboard, portal, and attendee views already read.

export interface MatchInput {
  id: string;
  name: string;
  interestTags: string; // JSON string[]
  lookingFor: string | null;
  offering: string | null;
  industry: string | null;
  goals: string | null;
  intentScore: number;
}

export interface MatchResult {
  score: number;
  reason: string;
  mutualInterests: string[];
  fitType: keyof typeof FIT_TYPES;
  suggestedMessage: string;
  suggestedGoal: string;
}

function words(s: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
}

/** True if two free-text fields share a meaningful word. */
function overlaps(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const bw = new Set(words(b));
  return words(a).some((w) => bw.has(w));
}

const INVEST_TERMS = ["invest", "investor", "capital", "co-invest", "fund", "funding", "raise", "founder", "seed"];
const BUYSELL_TERMS = ["buyer", "buyers", "enterprise", "customer", "customers", "platform", "saas", "channel", "partner", "partners"];

function hasTerm(s: string | null, terms: string[]): boolean {
  if (!s) return false;
  const low = s.toLowerCase();
  return terms.some((t) => low.includes(t));
}

function inferFit(a: MatchInput, b: MatchInput, complementary: boolean): keyof typeof FIT_TYPES {
  const investSignal =
    (hasTerm(a.lookingFor, INVEST_TERMS) || hasTerm(a.offering, INVEST_TERMS) || hasTerm(a.goals, INVEST_TERMS)) &&
    (hasTerm(b.lookingFor, INVEST_TERMS) || hasTerm(b.offering, INVEST_TERMS) || hasTerm(b.goals, INVEST_TERMS));
  if (investSignal) return "INVESTOR_FOUNDER";
  if (complementary && (hasTerm(a.offering, BUYSELL_TERMS) || hasTerm(b.offering, BUYSELL_TERMS))) return "BUYER_SELLER";
  if (complementary) return "BUYER_SELLER";
  return "PEER";
}

export function scorePair(a: MatchInput, b: MatchInput): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const ai = parseJson<string[]>(a.interestTags, []).map((t) => t.toLowerCase());
  const bi = new Set(parseJson<string[]>(b.interestTags, []).map((t) => t.toLowerCase()));
  const mutual = [...new Set(ai.filter((t) => bi.has(t)))];
  if (mutual.length) {
    score += Math.min(40, mutual.length * 20);
    reasons.push(`shared interest in ${mutual.join(", ")}`);
  }

  const comp1 = overlaps(a.lookingFor, b.offering);
  const comp2 = overlaps(b.lookingFor, a.offering);
  if (comp1) {
    score += 25;
    reasons.push(`${a.name.split(" ")[0]} is looking for what ${b.name.split(" ")[0]} offers`);
  }
  if (comp2) {
    score += 25;
    reasons.push(`${b.name.split(" ")[0]} is looking for what ${a.name.split(" ")[0]} offers`);
  }

  if (a.industry && b.industry && a.industry === b.industry) {
    score += 10;
    reasons.push(`both work in ${a.industry}`);
  }
  if (overlaps(a.goals, b.goals)) {
    score += 8;
    reasons.push("aligned goals for the event");
  }

  // Intent boost — higher-intent attendees make better matches.
  score += Math.round(((a.intentScore + b.intentScore) / 2) * 0.1);
  score = Math.max(0, Math.min(100, score));

  const fitType = inferFit(a, b, comp1 || comp2);
  const mutualDisplay = [...new Set(parseJson<string[]>(a.interestTags, []).filter((t) => bi.has(t.toLowerCase())))];

  const suggestedGoal =
    fitType === "INVESTOR_FOUNDER"
      ? "Discuss investment or fundraising"
      : fitType === "BUYER_SELLER"
        ? "Explore a pilot or partnership"
        : "Compare notes and find ways to help each other";

  const opener = mutual.length
    ? `Hi ${b.name.split(" ")[0]} — I noticed we're both focused on ${mutual[0]}. Open to a quick 1:1 at the event?`
    : `Hi ${b.name.split(" ")[0]} — I think there's strong overlap between what we're each working on. Want to grab a meeting?`;

  return {
    score,
    reason: reasons.length ? reasons.join("; ") : "Complementary profiles and event goals.",
    mutualInterests: mutualDisplay,
    fitType,
    suggestedMessage: opener,
    suggestedGoal,
  };
}
