import Link from "next/link";
import {
  Layers,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Rocket,
  TriangleAlert,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { EVENT_STATUS } from "@/lib/constants";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field, Textarea, Select } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState, Separator } from "@/components/ui/misc";
import { isStorageConfigured } from "@/lib/storage";
import { ImageUpload } from "@/components/builder/image-upload";
import { parseJson, cn, formatDate } from "@/lib/utils";
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
  updateBrandColor,
  updatePageContent,
  draftDescription,
} from "./actions";
import { setEventStatus } from "../settings/actions";
import { BrandColorPicker } from "./brand-color";
import { PageContentEditor } from "./page-content";

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

  const [ticketCount, questionCount] = await Promise.all([
    db.ticket.count({ where: { eventId: id, isActive: true } }),
    db.registrationField.count({ where: { eventId: id } }),
  ]);

  // Eventbrite-style setup checklist, computed from the data the public page
  // actually renders.
  const isLive = event.status === "PUBLISHED" || event.status === "LIVE";
  const checklist = [
    {
      label: "Add a tagline",
      hint: "One line under your title that sells the event.",
      done: Boolean(event.tagline),
      href: "#page-content",
    },
    {
      label: "Tell your story",
      hint: "The “About this event” section — draft it with AI in one click.",
      done: Boolean(event.description),
      href: "#page-content",
    },
    {
      label: "Set date & location",
      hint: "Attendees see these in your hero.",
      done: Boolean(event.startsAt) && Boolean(event.venueName || event.city || event.format !== "IN_PERSON"),
      href: `/dashboard/events/${id}/settings`,
    },
    {
      label: "Create a ticket",
      hint: "Free or paid — registration needs at least one.",
      done: ticketCount > 0,
      href: `/dashboard/events/${id}/tickets`,
    },
    {
      label: "Add registration questions",
      hint: "Optional — learn who's coming and what they want.",
      done: questionCount > 0,
      href: `/dashboard/events/${id}/registration`,
    },
    {
      label: "Publish your event",
      hint: "Opens registration on your public page.",
      done: isLive,
      href: null,
    },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

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
          <p className="text-sm text-muted-foreground">
            Build your event page the way attendees will see it — title, story, sections, and branding.
          </p>
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

      {/* Registration status banner — the fastest path from building to a live registration page. */}
      {event.status === "DRAFT" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <div>
              <p className="text-sm font-medium">Your event is still a draft — attendees can&apos;t register yet.</p>
              <p className="text-xs text-muted-foreground">Publish the event to open registration on your public page.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink href={`/e/${event.slug}`} variant="outline" size="sm">
              <Eye /> Preview page
            </ButtonLink>
            <form action={setEventStatus}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="status" value="PUBLISHED" />
              <Button type="submit" size="sm">
                <Rocket /> Publish event
              </Button>
            </form>
          </div>
        </div>
      ) : event.status === "PUBLISHED" || event.status === "LIVE" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-success/40 bg-success/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-sm font-medium">Registration is live — attendees can sign up on your public page.</p>
          </div>
          <ButtonLink href={`/e/${event.slug}`} variant="outline" size="sm" className="shrink-0">
            <ExternalLink /> View registration page
          </ButtonLink>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-lg border bg-secondary/40 p-4">
          <Eye className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This event is {EVENT_STATUS[event.status]?.label.toLowerCase() ?? event.status} — registration is closed. Change the
            status under <span className="font-medium text-foreground">Settings</span> to reopen it.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT: content editor + sections */}
        <div className="space-y-6">
          {/* Hero + About — the content the public page actually renders */}
          <Card id="page-content" className="scroll-mt-6">
            <CardHeader>
              <CardTitle className="text-base">Page content</CardTitle>
              <CardDescription>
                Your title, tagline, and story — exactly what attendees read on your public page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PageContentEditor
                eventId={event.id}
                initial={{
                  name: event.name,
                  tagline: event.tagline ?? "",
                  description: event.description ?? "",
                }}
                action={updatePageContent}
                aiDraft={draftDescription}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Extra sections</h3>
              <p className="text-xs text-muted-foreground">
                Sections on your Home page appear on the public event page, below your story.
              </p>
            </div>
          </div>

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

        {/* RIGHT: sticky checklist + preview + brand */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Get your page ready
                <span className="text-sm font-normal text-muted-foreground">
                  {doneCount} of {checklist.length}
                </span>
              </CardTitle>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {checklist.map((item) => {
                const inner = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                        item.done ? "border-success bg-success text-white" : "border-muted-foreground/40"
                      )}
                    >
                      {item.done && <CircleCheck className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-medium", item.done && "text-muted-foreground line-through")}>
                        {item.label}
                      </span>
                      {!item.done && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                    </span>
                  </>
                );
                return item.href && !item.done ? (
                  <Link key={item.label} href={item.href} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-secondary/60">
                    {inner}
                  </Link>
                ) : (
                  <div key={item.label} className="flex items-start gap-2.5 rounded-lg p-2">
                    {inner}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div
              className="px-5 py-8 text-white"
              style={{ background: `linear-gradient(135deg, ${event.brandColor}, ${event.brandColor}cc)` }}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">Live preview</p>
              <h3 className="mt-1 text-xl font-semibold">{event.name}</h3>
              {event.tagline && <p className="mt-1 text-sm opacity-90">{event.tagline}</p>}
              <p className="mt-3 text-xs opacity-80">
                {event.startsAt ? formatDate(event.startsAt) : "Date TBA"}
                {event.city ? ` · ${event.city}` : ""}
              </p>
              <span className="mt-3 inline-block rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold" style={{ color: event.brandColor }}>
                Register now
              </span>
            </div>
            <CardContent className="flex items-center justify-between py-3 text-sm text-muted-foreground">
              How your hero renders to attendees.
              <ButtonLink href={`/e/${event.slug}`} variant="ghost" size="sm">
                <ExternalLink /> Open
              </ButtonLink>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BrandColorPicker eventId={event.id} initial={event.brandColor} action={updateBrandColor} />
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
                SEO and event details are managed under{" "}
                <span className="font-medium text-foreground">Settings</span>.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
