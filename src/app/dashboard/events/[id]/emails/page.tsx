import { Mail, Plus, Send, Users, MailOpen, Sparkles } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { pct } from "@/lib/utils";
import { CAMPAIGN_STATUS } from "@/lib/constants";

const SEGMENTS = [
  { value: "ALL", label: "All" },
  { value: "REGISTERED", label: "Registered" },
  { value: "PENDING", label: "Pending" },
  { value: "CHECKED_IN", label: "Checked-in" },
  { value: "SPEAKERS", label: "Speakers" },
  { value: "SPONSORS", label: "Sponsors" },
];

export default async function EmailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const campaigns = await db.emailCampaign.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
  });

  const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.opens, 0);
  const avgOpenRate = pct(totalOpens, totalRecipients);

  const aiEmail = await generate("follow_up_email", { name: event.name });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Build, segment, and measure your event communications.
          </p>
        </div>
        <Button variant="primary">
          <Plus /> New campaign
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Campaigns" value={campaigns.length} icon={<Mail />} />
        <StatCard label="Total recipients" value={totalRecipients} icon={<Users />} tone="info" />
        <StatCard label="Avg open rate" value={`${avgOpenRate}%`} icon={<MailOpen />} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Performance across all sends for this event.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Mail />}
                title="No campaigns yet"
                description="Create your first campaign to reach attendees, speakers, or sponsors."
                action={
                  <Button variant="primary">
                    <Plus /> New campaign
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Subject</TH>
                  <TH>Segment</TH>
                  <TH>Status</TH>
                  <TH>Recipients</TH>
                  <TH>Open rate</TH>
                  <TH>Click rate</TH>
                </TR>
              </THead>
              <TBody>
                {campaigns.map((c) => {
                  const meta = CAMPAIGN_STATUS[c.status] ?? {
                    label: c.status,
                    tone: "neutral" as const,
                  };
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD className="max-w-xs truncate text-muted-foreground">{c.subject}</TD>
                      <TD>
                        <Badge tone="neutral">{c.segment}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </TD>
                      <TD>{c.recipients}</TD>
                      <TD>{pct(c.opens, c.recipients)}%</TD>
                      <TD>{pct(c.clicks, c.recipients)}%</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Composer</CardTitle>
            <CardDescription>Draft a new campaign and pick an audience segment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Subject">
              <Input placeholder="e.g. Your schedule for the big day" />
            </Field>
            <Field label="Segment">
              <Select defaultValue="ALL">
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Body">
              <Textarea placeholder="Write your message…" />
            </Field>
            <div className="flex justify-end">
              <Button variant="primary">
                <Send /> Save campaign
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> AI email assistant
            </CardTitle>
            <CardDescription>
              A suggested follow-up for {event.name}. Reviewable and editable before sending.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap rounded-lg border bg-secondary/30 p-4 text-sm leading-relaxed">
              {aiEmail.output}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
