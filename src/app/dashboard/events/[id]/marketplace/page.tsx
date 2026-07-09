import { Store } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field, Select, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { Avatar, EmptyState, Separator } from "@/components/ui/misc";
import { createMarketplacePost, updateMarketplacePost, deleteMarketplacePost } from "../manage-actions";

export default async function MarketplacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const posts = await db.marketplacePost.findMany({
    where: { eventId: id },
    orderBy: { sponsored: "desc" },
  });

  const filters = ["All", "Offers", "Needs"];

  const postFields = (p?: (typeof posts)[number]) => (
    <>
      <input type="hidden" name="eventId" value={id} />
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Title">
        <Input name="title" placeholder="Offering pilot pricing for startups" defaultValue={p?.title ?? ""} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select name="kind" defaultValue={p?.kind ?? "OFFER"}>
            <option value="OFFER">Offer</option>
            <option value="NEED">Need</option>
          </Select>
        </Field>
        <Field label="Category">
          <Input name="category" placeholder="Partnership" defaultValue={p?.category ?? ""} />
        </Field>
      </div>
      <Field label="Posted by">
        <Input name="authorName" placeholder="Organizer" defaultValue={p?.authorName ?? ""} />
      </Field>
      <Field label="Target audience">
        <Input name="audience" placeholder="Early-stage founders" defaultValue={p?.audience ?? ""} />
      </Field>
      <Field label="Keywords" hint="Comma-separated.">
        <Input name="keywords" placeholder="GTM, Growth" defaultValue={p ? parseJson<string[]>(p.keywords, []).join(", ") : ""} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} placeholder="Details of the offer or need." defaultValue={p?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sponsored" defaultChecked={p?.sponsored ?? false} className="size-4 accent-[hsl(243_75%_59%)]" /> Mark as sponsored
      </label>
    </>
  );

  const newPostDialog = (
    <FormDialog buttonLabel="Create post" title="Create marketplace post" action={createMarketplacePost} submitLabel="Create post">
      {postFields()}
    </FormDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Marketplace</h2>
          <p className="text-sm text-muted-foreground">Offers and needs posted by your community.</p>
        </div>
        {newPostDialog}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f, i) => (
          <Badge key={f} tone={i === 0 ? "primary" : "neutral"} className="cursor-pointer px-3 py-1">
            {f}
          </Badge>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="No posts yet"
          description="Let attendees post what they're offering or looking for to spark connections."
          action={
            <FormDialog buttonLabel="Create post" title="Create marketplace post" action={createMarketplacePost} submitLabel="Create post">
              {postFields()}
            </FormDialog>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const keywords = parseJson<string[]>(post.keywords, []);
            const isOffer = post.kind === "OFFER";
            return (
              <Card key={post.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={isOffer ? "primary" : "info"}>{isOffer ? "Offer" : "Need"}</Badge>
                      {post.sponsored && <Badge tone="warning">Sponsored</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <FormDialog
                        mode="edit"
                        buttonLabel={`Edit ${post.title}`}
                        title="Edit marketplace post"
                        action={updateMarketplacePost}
                        submitLabel="Save changes"
                      >
                        {postFields(post)}
                      </FormDialog>
                      <DeleteButton
                        action={deleteMarketplacePost}
                        id={post.id}
                        eventId={id}
                        confirmText={`Delete "${post.title}"?`}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold leading-snug">{post.title}</p>
                    {post.category && <p className="mt-0.5 text-sm text-muted-foreground">{post.category}</p>}
                  </div>

                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.slice(0, 4).map((k) => (
                        <Badge key={k} tone="neutral">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Avatar name={post.authorName} size={28} />
                    <span className="truncate text-sm text-muted-foreground">{post.authorName}</span>
                  </div>

                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Contact
                    </Button>
                    <Button size="sm" className="flex-1">
                      Request meeting
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
