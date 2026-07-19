import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 100;

export default async function AdminUsersPage() {
  await requireAdmin();

  const [total, users] = await Promise.all([
    db.user.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { memberships: { include: { organization: true }, take: 1 } },
    }),
  ]);

  return (
    <div>
      <Link href="/dashboard/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Platform admin
      </Link>
      <PageHeader
        title="Users"
        description={`${total} account${total === 1 ? "" : "s"} on the platform${total > PAGE_SIZE ? ` — showing the newest ${PAGE_SIZE}` : ""}.`}
      />
      <Card className="min-w-0">
        <CardContent className="px-0">
          {users.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Role</TH>
                    <TH>Workspace</TH>
                    <TH>Joined</TH>
                  </TR>
                </THead>
                <TBody>
                  {users.map((u) => (
                    <TR key={u.id}>
                      <TD className="font-medium">{u.name}</TD>
                      <TD className="text-muted-foreground">{u.email}</TD>
                      <TD>
                        {u.role === "PLATFORM_ADMIN" ? (
                          <Badge tone="primary">Admin</Badge>
                        ) : (
                          <Badge tone="neutral">{u.role}</Badge>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">{u.memberships[0]?.organization.name ?? "—"}</TD>
                      <TD className="text-muted-foreground">{formatDate(u.createdAt)}</TD>
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
