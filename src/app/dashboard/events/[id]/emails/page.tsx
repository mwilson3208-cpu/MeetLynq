import { Mail, Send, Users, MailOpen, Sparkles } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { StatCard, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DeleteButton } from "@/components/ui/delete-button";
import { pct } from "@/lib/utils";
import { CAMPAIGN_STATUS } from "@/lib/constants";
import { sendCampaign, deleteCampaign } from "./actions";
import { Composer } from "./composer";

const SEGMENT_LABEL: Record<string, string> = {
  ALL: "All attendees",
  REGISTERED: "Registered (confirmed)",
  PENDING: "Pending",
  CHECKED_IN: "Checked-in",
};

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
      <div>
        <h2 className="text-lg font-semibold">Email campaigns</h2>
        <p className="text-sm text-muted-foreground">
          Build, segment, and measure your event communications.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Campaigns" value={campaigns.length} icon={<Mail />} />
        <StatCard label="Total recipients" value={totalRecipients} icon={<Users />} tone="info" />
        <StatCard label="Avg open rate" value={`${avgOpenRate}%`} icon={<MailOpen />} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Draft campaigns can be sent to their segment. Recipient counts reflect real matching
            registrations at send time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Mail />}
                title="No campaigns yet"
                description="Draft your first campaign in the composer below to reach attendees."
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
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {campaigns.map((c) => {
                  const meta = CAMPAIGN_STATUS[c.status] ?? { label: c.status, tone: "neutral" as const };
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD className="max-w-xs truncate text-muted-foreground">{c.subject}</TD>
                      <TD>
                        <Badge tone="neutral">{SEGMENT_LABEL[c.segment] ?? c.segment}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </TD>
                      <TD>{c.recipients}</TD>
                      <TD>{pct(c.opens, c.recipients)}%</TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          {c.status !== "SENT" && (
                            <form action={sendCampaign}>
                              <input type="hidden" name="eventId" value={id} />
                              <input type="hidden" name="id" value={c.id} />
                              <Button type="submit" size="sm" variant="outline">
                                <Send className="size-4" /> Send
                              </Button>
                            </form>
                          )}
                          <DeleteButton
                            action={deleteCampaign}
                            id={c.id}
                            eventId={id}
                            confirmText="Delete this campaign?"
                          />
                        </div>
                      </TD>
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
          <CardContent>
            <Composer eventId={id} />
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
