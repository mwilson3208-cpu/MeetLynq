import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { toCsv, csvFilename, type CsvValue } from "@/lib/csv";
import { parseJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Authorized CSV export for an event's list data. ?type= selects the dataset.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id); // 404s if the current user's org doesn't own it
  const type = new URL(req.url).searchParams.get("type") ?? "attendees";

  let headers: string[] = [];
  let rows: CsvValue[][] = [];

  switch (type) {
    case "attendees": {
      const regs = await db.registration.findMany({
        where: { eventId: id },
        include: { ticket: true },
        orderBy: { createdAt: "desc" },
      });
      headers = ["First name", "Last name", "Email", "Ticket", "Status", "Registered"];
      rows = regs.map((r) => [r.firstName, r.lastName, r.email, r.ticket?.name ?? "", r.status, r.createdAt.toISOString()]);
      break;
    }
    case "leads": {
      const leads = await db.lead.findMany({ where: { eventId: id }, orderBy: { createdAt: "desc" } });
      headers = ["Name", "Email", "Company", "Source", "Quality", "Notes", "Captured"];
      rows = leads.map((l) => [l.name, l.email ?? "", l.company ?? "", l.source, l.quality, l.notes ?? "", l.createdAt.toISOString()]);
      break;
    }
    case "participants": {
      const parts = await db.participant.findMany({ where: { eventId: id }, orderBy: { intentScore: "desc" } });
      headers = ["Name", "Email", "Title", "Company", "Industry", "Location", "Intent score", "Interests"];
      rows = parts.map((p) => [
        p.name,
        p.email,
        p.title ?? "",
        p.companyName ?? "",
        p.industry ?? "",
        p.location ?? "",
        p.intentScore,
        parseJson<string[]>(p.interestTags, []).join("; "),
      ]);
      break;
    }
    case "companies": {
      const companies = await db.company.findMany({ where: { eventId: id }, orderBy: { name: "asc" } });
      headers = ["Name", "Industry", "Booth", "Website", "Looking for", "Offering"];
      rows = companies.map((c) => [c.name, c.industry ?? "", c.boothNumber ?? "", c.website ?? "", c.lookingFor ?? "", c.offering ?? ""]);
      break;
    }
    case "speakers": {
      const speakers = await db.speaker.findMany({ where: { eventId: id }, orderBy: { name: "asc" } });
      headers = ["Name", "Title", "Company", "Session", "Featured"];
      rows = speakers.map((s) => [s.name, s.title ?? "", s.companyName ?? "", s.sessionTitle ?? "", s.featured ? "Yes" : "No"]);
      break;
    }
    case "sponsors": {
      const sponsors = await db.sponsor.findMany({ where: { eventId: id }, orderBy: { valueScore: "desc" } });
      headers = ["Name", "Level", "Value score", "Website"];
      rows = sponsors.map((s) => [s.name, s.level, s.valueScore, s.website ?? ""]);
      break;
    }
    case "exhibitors": {
      const exhibitors = await db.exhibitor.findMany({ where: { eventId: id }, orderBy: { name: "asc" } });
      headers = ["Name", "Booth", "Website", "Description"];
      rows = exhibitors.map((e) => [e.name, e.boothNumber ?? "", e.website ?? "", e.description ?? ""]);
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  }

  const csv = toCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`${event.slug}-${type}`)}"`,
      "Cache-Control": "no-store",
    },
  });
}
