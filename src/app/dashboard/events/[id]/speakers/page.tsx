import { Plus, Mic, Search, Sparkles } from "lucide-react";
import { getEventOr404 } from "@/lib/queries";
import { db } from "@/lib/db";
import { generate } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, EmptyState } from "@/components/ui/misc";

export default async function SpeakersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getEventOr404(id);

  const speakers = await db.speaker.findMany({
    where: { eventId: id },
    orderBy: { featured: "desc" },
  });

  const ai = await generate("speaker_bio", { name: "your speaker", industry: "their field" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Speakers</h2>
          <p className="text-sm text-muted-foreground">Your lineup of voices for the event.</p>
        </div>
        <Button>
          <Plus className="size-4" /> Add speaker
        </Button>
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
            <Button>
              <Plus className="size-4" /> Add speaker
            </Button>
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
