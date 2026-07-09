import { Layers, Sparkles, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Rocket } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState, Separator } from "@/components/ui/misc";
import { isStorageConfigured } from "@/lib/storage";
import { ImageUpload } from "@/components/builder/image-upload";
import { parseJson, cn } from "@/lib/utils";
import { uploadEventCover } from "./upload-actions";
import {
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  createPage,
  updatePage,
  togglePagePublished,
  movePage,
  deletePage,
  publishAllPages,
} from "./actions";

const SECTION_TYPES = ["hero", "richtext", "speakers", "sponsors", "agenda", "tickets", "marketplace", "cta", "gallery", "faq"];

/** Small server-action icon button with hidden id/eventId (+ optional extras). */
function IconAction({
  action,
  eventId,
  id,
  extra,
  label,
  disabled,
  danger,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  eventId: string;
  id: string;
  extra?: Record<string, string>;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-25 [&_svg]:size-4",
          danger && "hover:bg-destructive/10 hover:text-destructive"
        )}
      >
        {children}
      </button>
    </form>
  );
}

export default async function EventBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const pages = await db.eventPage.findMany({
    where: { eventId: id },
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { navOrder: "asc" },
  });

  const ai = await generate("page_copy", { name: event.name });

  const sectionTypeSelect = (defaultVal = "richtext") => (
    <Select name="type" defaultValue={defaultVal}>
      {SECTION_TYPES.map((t) => (
        <option key={t} value={t} className="capitalize">
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Event builder</h2>
          <p className="text-sm text-muted-foreground">Design your pages, sections, and branding — no code required.</p>
        </div>
        <div className="flex items-center gap-2">
          <FormDialog buttonLabel="Add page" title="Add page" action={createPage} submitLabel="Add page" buttonSize="sm">
            <input type="hidden" name="eventId" value={id} />
            <Field label="Page title">
              <Input name="title" placeholder="Sponsors" required />
            </Field>
          </FormDialog>
          <form action={publishAllPages}>
            <input type="hidden" name="eventId" value={id} />
            <Button type="submit" size="sm">
              <Rocket className="size-4" /> Publish all pages
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT: page + section editor */}
        <div className="space-y-6">
          {pages.length === 0 ? (
            <EmptyState
              icon={<Layers />}
              title="No pages yet"
              description="Add your first page to start building your event site."
              action={
                <FormDialog buttonLabel="Add page" title="Add page" action={createPage} submitLabel="Add page">
                  <input type="hidden" name="eventId" value={id} />
                  <Field label="Page title">
                    <Input name="title" placeholder="Home" required />
                  </Field>
                </FormDialog>
              }
            />
          ) : (
            pages.map((page, pageIdx) => (
              <Card key={page.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    {page.isHome && <Badge tone="info">Home</Badge>}
                    <Badge tone={page.published ? "success" : "neutral"}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <IconAction action={movePage} eventId={id} id={page.id} extra={{ dir: "up" }} label="Move page up" disabled={pageIdx === 0}>
                      <ChevronUp />
                    </IconAction>
                    <IconAction action={movePage} eventId={id} id={page.id} extra={{ dir: "down" }} label="Move page down" disabled={pageIdx === pages.length - 1}>
                      <ChevronDown />
                    </IconAction>
                    <FormDialog mode="edit" buttonLabel="Rename page" title="Rename page" action={updatePage} submitLabel="Save">
                      <input type="hidden" name="eventId" value={id} />
                      <input type="hidden" name="id" value={page.id} />
                      <Field label="Page title">
                        <Input name="title" defaultValue={page.title} required />
                      </Field>
                    </FormDialog>
                    <IconAction action={togglePagePublished} eventId={id} id={page.id} label={page.published ? "Unpublish" : "Publish"}>
                      {page.published ? <EyeOff /> : <Eye />}
                    </IconAction>
                    {!page.isHome && (
                      <IconAction action={deletePage} eventId={id} id={page.id} label="Delete page" danger>
                        <Trash2 />
                      </IconAction>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {page.sections.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      No sections in this page yet.
                    </p>
                  ) : (
                    page.sections.map((section, secIdx) => {
                      const cfg = parseJson<{ heading?: string | null; body?: string | null }>(section.config, {});
                      return (
                        <div key={section.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                          <div className="flex flex-col">
                            <IconAction action={moveSection} eventId={id} id={section.id} extra={{ dir: "up" }} label="Move up" disabled={secIdx === 0}>
                              <ChevronUp />
                            </IconAction>
                            <IconAction action={moveSection} eventId={id} id={section.id} extra={{ dir: "down" }} label="Move down" disabled={secIdx === page.sections.length - 1}>
                              <ChevronDown />
                            </IconAction>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium capitalize">{section.type}</span>
                            {cfg.heading && <p className="truncate text-xs text-muted-foreground">{cfg.heading}</p>}
                          </div>
                          <FormDialog mode="edit" buttonLabel="Edit section" title={`Edit ${section.type} section`} action={updateSection} submitLabel="Save section">
                            <input type="hidden" name="eventId" value={id} />
                            <input type="hidden" name="id" value={section.id} />
                            <Field label="Heading">
                              <Input name="heading" defaultValue={cfg.heading ?? ""} placeholder="Section heading" />
                            </Field>
                            <Field label="Body">
                              <Textarea name="body" rows={3} defaultValue={cfg.body ?? ""} placeholder="Section content — line breaks are preserved." />
                            </Field>
                          </FormDialog>
                          <IconAction action={deleteSection} eventId={id} id={section.id} label="Delete section" danger>
                            <Trash2 />
                          </IconAction>
                        </div>
                      );
                    })
                  )}

                  <FormDialog buttonLabel="Add section" title="Add section" action={createSection} submitLabel="Add section" buttonSize="sm">
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="pageId" value={page.id} />
                    <Field label="Section type">{sectionTypeSelect()}</Field>
                    <Field label="Heading">
                      <Input name="heading" placeholder="Optional heading" />
                    </Field>
                    <Field label="Body">
                      <Textarea name="body" rows={3} placeholder="Optional content." />
                    </Field>
                  </FormDialog>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* RIGHT: sticky preview + brand + SEO + AI */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div
              className="px-5 py-8 text-white"
              style={{ background: `linear-gradient(135deg, ${event.brandColor}, ${event.brandColor}cc)` }}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">Live preview</p>
              <h3 className="mt-1 text-xl font-semibold">{event.name}</h3>
              {event.tagline && <p className="mt-1 text-sm opacity-90">{event.tagline}</p>}
            </div>
            <CardContent className="py-4 text-sm text-muted-foreground">
              This is how your hero will render to attendees.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="size-10 shrink-0 rounded-lg border" style={{ backgroundColor: event.brandColor }} />
                <div>
                  <p className="text-sm font-medium">Brand color</p>
                  <p className="text-xs text-muted-foreground">{event.brandColor}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Cover image</p>
                <ImageUpload
                  action={uploadEventCover}
                  eventId={event.id}
                  currentUrl={event.coverImageUrl}
                  label="Cover image"
                  configured={isStorageConfigured()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Brand color, SEO, and event details are managed under{" "}
                <span className="font-medium text-foreground">Settings</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> AI page copy
              </CardTitle>
              <CardDescription>Suggested hero copy — edit before publishing.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm">{ai.output}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
