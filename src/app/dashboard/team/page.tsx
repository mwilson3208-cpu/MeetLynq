import { UserPlus, Check, Minus, Shield } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, Avatar } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { Tone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const MEMBER_ROLES: Record<string, { label: string; tone: Tone }> = {
  OWNER: { label: "Owner", tone: "primary" },
  ADMIN: { label: "Admin", tone: "info" },
  TEAM_MEMBER: { label: "Team member", tone: "neutral" },
  STAFF: { label: "Check-in staff", tone: "warning" },
};

const CAPABILITIES = ["Manage events", "Registration", "Billing", "Team", "Check-in"] as const;

const MATRIX: { role: string; caps: boolean[] }[] = [
  { role: "Owner", caps: [true, true, true, true, true] },
  { role: "Admin", caps: [true, true, false, true, true] },
  { role: "Team member", caps: [true, true, false, false, true] },
  { role: "Check-in staff", caps: [false, false, false, false, true] },
];

export default async function TeamPage() {
  const { user, org } = await requireOrg();

  const members = await db.organizationMember.findMany({
    where: { organizationId: org.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Team & roles"
        description={`Manage who can access ${org.name} and what they can do.`}
        action={
          <Button>
            <UserPlus className="size-4" /> Invite member
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>{members.length} member{members.length === 1 ? "" : "s"} in this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Role</TH>
                    <TH>Joined</TH>
                  </TR>
                </THead>
                <TBody>
                  {members.map((m) => {
                    const role = MEMBER_ROLES[m.role] ?? { label: m.role, tone: "neutral" as Tone };
                    return (
                      <TR key={m.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <Avatar name={m.user.name} src={m.user.avatarUrl} size={36} />
                            <span className="font-medium">
                              {m.user.name}
                              {m.userId === user.id && (
                                <span className="ml-2 text-xs text-muted-foreground">You</span>
                              )}
                            </span>
                          </div>
                        </TD>
                        <TD className="text-muted-foreground">{m.user.email}</TD>
                        <TD>
                          <Badge tone={role.tone}>{role.label}</Badge>
                        </TD>
                        <TD className="text-muted-foreground">{formatDate(m.createdAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4 text-primary" /> Roles & permissions
              </CardTitle>
              <CardDescription>What each role can access across the workspace.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Role</TH>
                    {CAPABILITIES.map((c) => (
                      <TH key={c} className="text-center">{c}</TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {MATRIX.map((row) => (
                    <TR key={row.role}>
                      <TD className="font-medium">{row.role}</TD>
                      {row.caps.map((on, i) => (
                        <TD key={i} className="text-center">
                          {on ? (
                            <Check className="mx-auto size-4 text-success" />
                          ) : (
                            <Minus className="mx-auto size-4 text-muted-foreground/40" />
                          )}
                        </TD>
                      ))}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Invite a teammate</CardTitle>
              <CardDescription>Send an invitation to join your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Email address">
                <Input type="email" placeholder="teammate@company.com" />
              </Field>
              <Field label="Role" hint="You can change this later.">
                <Select defaultValue="TEAM_MEMBER">
                  <option value="ADMIN">Admin</option>
                  <option value="TEAM_MEMBER">Team member</option>
                  <option value="STAFF">Check-in staff</option>
                </Select>
              </Field>
              <Button className="w-full">
                <UserPlus className="size-4" /> Send invite
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
