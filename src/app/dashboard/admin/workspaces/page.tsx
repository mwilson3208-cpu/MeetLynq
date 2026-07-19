import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 100;

export default async function AdminWorkspacesPage() {
  await requireAdmin();

  const [total, orgs] = await Promise.all([
    db.organization.count(),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        _count: { select: { members: true, events: true } },
        members: { where: { role: "OWNER" }, include: { user: true }, take: 1 },
      },
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Platform admin
      </Link>
      <PageHeader
        title="Workspaces"
        description={`${total} organization${total === 1 ? "" : "s"}${total > PAGE_SIZE ? ` — showing the newest ${PAGE_SIZE}` : ""}.`}
      />
      <Card className="min-w-0">
        <CardContent className="px-0">
          {orgs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No workspaces yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Workspace</TH>
                    <TH>Owner</TH>
                    <TH>Plan</TH>
                    <TH>Members</TH>
                    <TH>Events</TH>
                    <TH>Created</TH>
                  </TR>
                </THead>
                <TBody>
                  {orgs.map((o) => (
                    <TR key={o.id}>
                      <TD className="font-medium">{o.name}</TD>
                      <TD className="text-muted-foreground">{o.members[0]?.user.email ?? "—"}</TD>
                      <TD><Badge tone="neutral">{o.plan}</Badge></TD>
                      <TD>{o._count.members}</TD>
                      <TD>{o._count.events}</TD>
                      <TD className="text-muted-foreground">{formatDate(o.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
