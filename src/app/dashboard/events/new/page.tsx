import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { CreateEventForm } from "./form";
import { createEvent } from "./actions";

export const metadata: Metadata = { title: "Create event" };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create a new event" description="The launch wizard sets up your event in a few steps. You can change everything later." />
      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
            <Sparkles className="size-4 shrink-0" />
            <span>Turn on the AI setup assistant to auto-draft your event description — you can review and edit it.</span>
          </div>
          <CreateEventForm action={createEvent} />
        </CardContent>
      </Card>
    </div>
  );
}
