// Shared definitions for organizer-defined registration form fields. Used by the
// dashboard form builder, the public registration form, and the register action.

export const FIELD_TYPES = {
  TEXT: "Short text",
  LONG_TEXT: "Long text",
  EMAIL: "Email",
  PHONE: "Phone",
  NUMBER: "Number",
  SINGLE_CHOICE: "Single choice",
  MULTI_CHOICE: "Multi choice",
} as const;

export type FieldType = keyof typeof FIELD_TYPES;

export function isFieldType(t: string): t is FieldType {
  return t in FIELD_TYPES;
}

export function isChoiceType(t: string): boolean {
  return t === "SINGLE_CHOICE" || t === "MULTI_CHOICE";
}

/** A registration field in the shape the client components consume. */
export interface FieldDTO {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

/** Parse the stored options JSON into a clean string[] (never throws). */
export function parseOptions(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => String(o)).filter((o) => o.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Normalize raw option text (comma- or newline-separated) into a de-duped,
 * trimmed, capped list. Returns null when the type isn't a choice type.
 */
export function normalizeOptions(type: string, raw: string): string[] | null {
  if (!isChoiceType(type)) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const v = part.trim().slice(0, 100);
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
    if (out.length >= 25) break;
  }
  return out;
}

/** The FormData key used for a custom field's answer on the public form. */
export function fieldInputName(id: string): string {
  return `custom_${id}`;
}

export interface SuggestedField {
  label: string;
  type: FieldType;
  options: string[];
}

/**
 * Turn an AI-generated block of suggested questions into structured fields.
 * A trailing "(A / B / C)" becomes a single-choice field with those options;
 * everything else becomes a long-text question. De-dupes by label.
 */
export function parseSuggestedQuestions(text: string): SuggestedField[] {
  const out: SuggestedField[] = [];
  const seen = new Set<string>();
  for (const raw of (text ?? "").split(/\r?\n/)) {
    // Strip a leading bullet or "1." / "1)" marker.
    let line = raw.trim().replace(/^([•\-*]|\d+[.)])\s+/, "").trim();
    if (!line || /^suggested questions/i.test(line)) continue;

    let label = line;
    let options: string[] = [];
    const m = line.match(/^(.*?)\s*\(([^)]*\/[^)]*)\)\s*$/);
    if (m) {
      label = m[1].trim();
      options = m[2].split("/").map((s) => s.trim()).filter(Boolean).slice(0, 25);
    }
    label = label.replace(/\s+/g, " ").slice(0, 120);
    if (label.length < 4) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ label, type: options.length >= 2 ? "SINGLE_CHOICE" : "LONG_TEXT", options });
    if (out.length >= 15) break;
  }
  return out;
}

const MAX_ANSWER = 2000;

/**
 * Read + validate custom field answers from submitted form data. Choice answers
 * are restricted to the field's allowed options; required fields must be filled.
 * Returns the answers keyed by field label, or an error message for the first
 * missing required field.
 */
export function collectFieldAnswers(
  fields: FieldDTO[],
  formData: FormData,
): { answers: Record<string, string>; error?: string } {
  const answers: Record<string, string> = {};
  for (const f of fields) {
    const name = fieldInputName(f.id);
    let value: string;
    if (f.type === "MULTI_CHOICE") {
      const chosen = formData.getAll(name).map((v) => String(v).trim());
      value = chosen.filter((v) => f.options.includes(v)).join(", ");
    } else {
      value = String(formData.get(name) ?? "").trim().slice(0, MAX_ANSWER);
      // Drop choice answers that aren't among the allowed options.
      if (f.type === "SINGLE_CHOICE" && value && !f.options.includes(value)) value = "";
    }
    if (f.required && !value) {
      return { answers, error: `Please complete "${f.label}".` };
    }
    if (value) answers[f.label] = value;
  }
  return { answers };
}
