import { Mic, Search, Sparkles } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "../manage-actions";

export default async function SpeakersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const speakers = await db.speaker.findMany({
    where: { eventId: id },
    orderBy: { featured: "desc" },
  });

  const ai = await generate("speaker_bio", { name: "your speaker", industry: "their field" });

  const speakerFields = (sp?: (typeof speakers)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {sp && <input type="hidden" name="id" value={sp.id} />}
      <Field label="Name">
        <Input name="name" placeholder="Jane Doe" defaultValue={sp?.name ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input name="title" placeholder="Head of Product" defaultValue={sp?.title ?? ""} />
        </Field>
        <Field label="Company">
          <Input name="companyName" placeholder="Acme Inc." defaultValue={sp?.companyName ?? ""} />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea name="bio" rows={3} placeholder="A short professional bio." defaultValue={sp?.bio ?? ""} />
      </Field>
      <Field label="Session title">
        <Input name="sessionTitle" placeholder="Scaling design systems" defaultValue={sp?.sessionTitle ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={sp?.featured ?? false} className="size-4 accent-[hsl(243_75%_59%)]" /> Feature this speaker
      </label>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Speakers</h2>
          <p className="text-sm text-muted-foreground">Your lineup of voices for the event.</p>
        </div>
        <FormDialog
          buttonLabel="Add speaker"
          title="Add speaker"
          description="Add a speaker to your event lineup."
          action={createSpeaker}
          submitLabel="Add speaker"
        >
          {speakerFields()}
        </FormDialog>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search speakers" className="pl-9" />
      </div>

      {speakers.length === 0 ? (
        <EmptyState
          icon={<Mic />}
          title="No speakers yet"
          description="Add speakers to showcase your lineup and link them to sessions."
          action={
            <FormDialog
              buttonLabel="Add speaker"
              title="Add speaker"
              description="Add a speaker to your event lineup."
              action={createSpeaker}
              submitLabel="Add speaker"
            >
              {speakerFields()}
            </FormDialog>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((sp) => (
            <Card key={sp.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar name={sp.name} src={sp.photoUrl} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{sp.name}</p>
                      {sp.featured && <Badge tone="warning">Featured</Badge>}
                    </div>
                    {sp.title && <p className="truncate text-sm text-muted-foreground">{sp.title}</p>}
                    {sp.companyName && <p className="truncate text-sm text-muted-foreground">{sp.companyName}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <FormDialog
                      mode="edit"
                      buttonLabel={`Edit ${sp.name}`}
                      title="Edit speaker"
                      description="Update this speaker."
                      action={updateSpeaker}
                      submitLabel="Save changes"
                    >
                      {speakerFields(sp)}
                    </FormDialog>
                    <DeleteButton
                      action={deleteSpeaker}
                      id={sp.id}
                      eventId={id}
                      confirmText={`Delete "${sp.name}"? This can't be undone.`}
                    />
                  </div>
                </div>
                {sp.sessionTitle && (
                  <p className="mt-4 line-clamp-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    {sp.sessionTitle}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> AI bio formatter
          </CardTitle>
          <CardDescription>Generate a polished speaker bio — review and edit before publishing.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm">{ai.output}</p>
        </CardContent>
      </Card>
    </div>
  );
}
