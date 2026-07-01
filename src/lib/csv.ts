// Minimal, correct CSV serialization (RFC-4180-ish): quote fields containing
// commas, quotes, or newlines and double any embedded quotes.

export type CsvValue = string | number | boolean | null | undefined;

function escapeField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) lines.push(row.map(escapeField).join(","));
  return lines.join("\r\n");
}

export function csvFilename(base: string): string {
  const safe = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe || "export"}.csv`;
}
