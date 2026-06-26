import { Plus, GripVertical, Layers, Sparkles } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field, Textarea } from "@/components/ui/input";
import { EmptyState, Separator } from "@/components/ui/misc";

export default async function EventBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventOr404(id);

  const pages = await db.eventPage.findMany({
    where: { eventId: id },
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { navOrder: "asc" },
  });

  const ai = await generate("page_copy", { name: event.name });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Event builder</h2>
          <p className="text-sm text-muted-foreground">Design your pages, sections, and branding — no code required.</p>
        </div>
        <Button>
          <Sparkles className="size-4" /> Publish page
        </Button>
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
                <Button>
                  <Plus className="size-4" /> Add page
                </Button>
              }
            />
          ) : (
            pages.map((page) => (
              <Card key={page.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{page.title}</CardTitle>
                    {page.isHome && <Badge tone="info">Home</Badge>}
                    <Badge tone={page.published ? "success" : "neutral"}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" /> Add section
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {page.sections.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      No sections in this page yet.
                    </p>
                  ) : (
                    page.sections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
                      >
                        <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                        <span className="text-sm font-medium capitalize">{section.type}</span>
                        <Badge tone="neutral" className="ml-auto">
                          #{section.order + 1}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Navigation editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Navigation</CardTitle>
              <CardDescription>Drag pages to reorder how they appear in your event nav.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a page to configure navigation.</p>
              ) : (
                pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
                  >
                    <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                    <span className="text-sm font-medium">{page.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Order {page.navOrder}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
                <span
                  className="size-10 shrink-0 rounded-lg border"
                  style={{ backgroundColor: event.brandColor }}
                />
                <div>
                  <p className="text-sm font-medium">Brand color</p>
                  <p className="text-xs text-muted-foreground">{event.brandColor}</p>
                </div>
              </div>
              <Separator />
              <Field label="Logo URL">
                <Input placeholder="https://…/logo.png" defaultValue={event.coverImageUrl ?? ""} />
              </Field>
              <Field label="Font family">
                <Input placeholder="Inter" defaultValue="Inter" />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>How your event appears in search and social.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="SEO title">
                <Input defaultValue={event.seoTitle ?? ""} placeholder={event.name} />
              </Field>
              <Field label="SEO description">
                <Textarea defaultValue={event.seoDescription ?? ""} placeholder="A short, compelling summary." />
              </Field>
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
