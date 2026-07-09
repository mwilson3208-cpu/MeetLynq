import { Store, Users, Flame } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { StatCard, Avatar, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { LEAD_QUALITY } from "@/lib/constants";
import { createExhibitor, updateExhibitor, deleteExhibitor } from "../manage-actions";

export default async function ExhibitorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const [exhibitors, leads, hotLeads, totalLeads] = await Promise.all([
    db.exhibitor.findMany({
      where: { eventId: id },
      include: { _count: { select: { leads: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.lead.count({ where: { eventId: id, quality: "HOT" } }),
    db.lead.count({ where: { eventId: id } }),
  ]);

  const exhibitorFields = (r?: (typeof exhibitors)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {r && <input type="hidden" name="id" value={r.id} />}
      <Field label="Exhibitor name">
        <Input name="name" placeholder="Orbit Robotics" defaultValue={r?.name ?? ""} required />
      </Field>
      <Field label="Booth number">
        <Input name="boothNumber" placeholder="B13" defaultValue={r?.boothNumber ?? ""} />
      </Field>
      <Field label="Website">
        <Input name="website" type="url" placeholder="https://example.com" defaultValue={r?.website ?? ""} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} placeholder="What they're showcasing." defaultValue={r?.description ?? ""} />
      </Field>
    </>
  );

  const newExhibitorDialog = (
    <FormDialog buttonLabel="Add exhibitor" title="Add exhibitor" action={createExhibitor} submitLabel="Add exhibitor">
      {exhibitorFields()}
    </FormDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Exhibitors</h2>
          <p className="text-sm text-muted-foreground">
            Booth management and the live lead pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton eventId={id} type="leads" label="Export leads (CSV)" />
          {newExhibitorDialog}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Exhibitors" value={exhibitors.length} icon={<Store />} />
        <StatCard label="Total leads" value={totalLeads} icon={<Users />} tone="info" />
        <StatCard label="Hot leads" value={hotLeads} icon={<Flame />} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booths</CardTitle>
          <CardDescription>Exhibiting companies and their captured leads.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {exhibitors.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Store />}
                title="No exhibitors yet"
                description="Add exhibitors to assign booths and start capturing leads on the floor."
                action={
                  <FormDialog buttonLabel="Add exhibitor" title="Add exhibitor" action={createExhibitor} submitLabel="Add exhibitor">
                    {exhibitorFields()}
                  </FormDialog>
                }
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Booth</TH>
                  <TH>Description</TH>
                  <TH>Leads</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {exhibitors.map((x) => (
                  <TR key={x.id}>
                    <TD>
                      <span className="flex items-center gap-3">
                        <Avatar name={x.name} src={x.logoUrl} size={32} />
                        <span className="font-medium">{x.name}</span>
                      </span>
                    </TD>
                    <TD>
                      {x.boothNumber ? (
                        <Badge tone="primary">Booth {x.boothNumber}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="max-w-xs truncate text-muted-foreground">
                      {x.description ?? "—"}
                    </TD>
                    <TD className="font-medium">{x._count.leads}</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <FormDialog
                          mode="edit"
                          buttonLabel={`Edit ${x.name}`}
                          title="Edit exhibitor"
                          action={updateExhibitor}
                          submitLabel="Save changes"
                        >
                          {exhibitorFields(x)}
                        </FormDialog>
                        <DeleteButton
                          action={deleteExhibitor}
                          id={x.id}
                          eventId={id}
                          confirmText={`Delete "${x.name}"? This can't be undone.`}
                        />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead pipeline</CardTitle>
          <CardDescription>Most recent leads captured across the event.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<Users />}
                title="No leads captured yet"
                description="Leads from booth scans, meetings, and sessions will appear here in real time."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Company</TH>
                  <TH>Source</TH>
                  <TH>Quality</TH>
                  <TH>Notes</TH>
                </TR>
              </THead>
              <TBody>
                {leads.map((l) => {
                  const meta = LEAD_QUALITY[l.quality] ?? {
                    label: l.quality,
                    tone: "neutral" as const,
                  };
                  return (
                    <TR key={l.id}>
                      <TD className="font-medium">{l.name}</TD>
                      <TD className="text-muted-foreground">{l.company ?? "—"}</TD>
                      <TD>
                        <Badge tone="neutral">{l.source}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </TD>
                      <TD className="max-w-xs truncate text-muted-foreground">{l.notes ?? "—"}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
