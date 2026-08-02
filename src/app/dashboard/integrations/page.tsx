import { Plug, Webhook as WebhookIcon, KeyRound, Zap, Plus } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { DocsDialog } from "./docs-dialog";
import {
  connectIntegration,
  disconnectIntegration,
  addWebhook,
  deleteWebhook,
  regenerateApiKey,
} from "./actions";
import { API_KEY_PROVIDER } from "./constants";

const PROVIDERS: { key: string; name: string; description: string }[] = [
  { key: "hubspot", name: "HubSpot", description: "Sync registrations and leads into your HubSpot CRM." },
  { key: "salesforce", name: "Salesforce", description: "Push attendees and meetings to Salesforce in real time." },
  { key: "zoho", name: "Zoho CRM", description: "Keep Zoho contacts updated with event activity." },
  { key: "airtable", name: "Airtable", description: "Mirror your event data into Airtable bases." },
  { key: "zapier", name: "Zapier", description: "Automate workflows across 9,000+ apps." },
];

export default async function IntegrationsPage() {
  const { org } = await requireOrg();

  const [integrations, webhooks] = await Promise.all([
    db.integration.findMany({ where: { organizationId: org.id } }),
    db.webhook.findMany({ where: { organizationId: org.id } }),
  ]);

  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  const apiKeyRow = integrations.find((i) => i.provider === API_KEY_PROVIDER);
  let apiKeyMasked = "No API key yet";
  if (apiKeyRow) {
    try {
      const key: string = JSON.parse(apiKeyRow.config).key ?? "";
      if (key) apiKeyMasked = `${key.slice(0, 9)}••••••••••••${key.slice(-4)}`;
    } catch {
      // ignore malformed config
    }
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect MeetLynq to your CRM and automation stack."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((p) => {
          const record = byProvider.get(p.key);
          const connected = record?.status === "CONNECTED";
          return (
            <Card key={p.key}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Plug className="size-5" />
                  </span>
                  <Badge tone={connected ? "success" : "neutral"}>
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <p className="mt-3 font-semibold">{p.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <form action={connected ? disconnectIntegration : connectIntegration} className="mt-4">
                  <input type="hidden" name="provider" value={p.key} />
                  <Button type="submit" variant={connected ? "outline" : "primary"} size="sm" className="w-full">
                    {connected ? "Disconnect" : "Connect"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <WebhookIcon className="size-4 text-primary" /> Webhooks
                </CardTitle>
                <CardDescription>Receive real-time events at your endpoints.</CardDescription>
              </div>
<FormDialog
                buttonLabel="Add webhook"
                title="Add webhook"
                description="We'll POST a signed JSON payload to your endpoint when the event fires."
                action={addWebhook}
                submitLabel="Add webhook"
                buttonSize="sm"
                buttonVariant="outline"
              >
                <Field label="Endpoint URL">
                  <Input name="url" type="url" required placeholder="https://example.com/hooks/meetlynq" />
                </Field>
                <Field label="Event">
                  <Select name="event" defaultValue="registration.created">
                    <option value="registration.created">registration.created</option>
                    <option value="registration.confirmed">registration.confirmed</option>
                    <option value="meeting.booked">meeting.booked</option>
                    <option value="lead.captured">lead.captured</option>
                    <option value="survey.response">survey.response</option>
                  </Select>
                </Field>
              </FormDialog>
            </CardHeader>
            <CardContent className="px-0">
              {webhooks.length === 0 ? (
                <div className="px-5">
                  <EmptyState
                    icon={<WebhookIcon />}
                    title="No webhooks yet"
                    description="Add an endpoint to start receiving event notifications."
                    action={<FormDialog
                        buttonLabel="Add webhook"
                        title="Add webhook"
                        description="We'll POST a signed JSON payload to your endpoint when the event fires."
                        action={addWebhook}
                        submitLabel="Add webhook"
                        buttonSize="sm"
                        buttonVariant="outline"
                      >
                        <Field label="Endpoint URL">
                          <Input name="url" type="url" required placeholder="https://example.com/hooks/meetlynq" />
                        </Field>
                        <Field label="Event">
                          <Select name="event" defaultValue="registration.created">
                            <option value="registration.created">registration.created</option>
                            <option value="registration.confirmed">registration.confirmed</option>
                            <option value="meeting.booked">meeting.booked</option>
                            <option value="lead.captured">lead.captured</option>
                            <option value="survey.response">survey.response</option>
                          </Select>
                        </Field>
                      </FormDialog>}
                  />
                </div>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Endpoint URL</TH>
                      <TH>Event</TH>
                      <TH>Status</TH>
                      <TH className="text-right">{"\u00A0"}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {webhooks.map((w) => (
                      <TR key={w.id}>
                        <TD className="max-w-xs truncate font-mono text-xs">{w.url}</TD>
                        <TD className="text-muted-foreground">{w.event}</TD>
                        <TD>
                          <Badge tone={w.active ? "success" : "neutral"}>
                            {w.active ? "Active" : "Paused"}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          <form action={deleteWebhook}>
                            <input type="hidden" name="id" value={w.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              Remove
                            </Button>
                          </form>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" /> Public API
              </CardTitle>
              <CardDescription>Use your secret key to access the MeetLynq REST API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-secondary/40 px-3 py-2 font-mono text-xs">
                {apiKeyMasked}
              </div>
              <div className="flex gap-2">
                <form action={regenerateApiKey}>
                  <Button type="submit" variant="outline" size="sm">
                    {apiKeyMasked === "No API key yet" ? "Generate key" : "Regenerate"}
                  </Button>
                </form>
                <DocsDialog />
              </div>
              <p className="text-xs text-muted-foreground">
                Treat your secret key like a password. It grants full access to your workspace data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4 text-primary" /> Zapier & CRM sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connect Zapier or a native CRM to automatically sync new registrations,
                booked meetings, and captured leads to your sales tools — no code required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
