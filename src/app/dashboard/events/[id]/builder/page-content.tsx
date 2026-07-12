"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";

type State = { ok?: boolean; error?: string } | null;

/**
 * Inline editor for the content attendees actually see on the public event
 * page: the hero (name + tagline) and the "About this event" story. Includes
 * an AI draft button for the description.
 */
export function PageContentEditor({
  eventId,
  initial,
  action,
  aiDraft,
}: {
  eventId: string;
  initial: { name: string; tagline: string; description: string };
  action: (prev: State, fd: FormData) => Promise<State>;
  aiDraft: (eventId: string) => Promise<{ text?: string; error?: string }>;
}) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [description, setDescription] = useState(initial.description);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [drafting, startDrafting] = useTransition();

  const dirty =
    name !== initial.name || tagline !== initial.tagline || description !== initial.description;

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("name", name);
      fd.set("tagline", tagline);
      fd.set("description", description);
      const res = await action(null, fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  function draft() {
    setError(null);
    startDrafting(async () => {
      const res = await aiDraft(eventId);
      if (res.error) setError(res.error);
      else if (res.text) setDescription(res.text);
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Event title" hint="The headline of your page.">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="GrowthScale Summit 2026" />
      </Field>
      <Field label="Tagline" hint="One line under the title that sells the event.">
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Where revenue leaders meet the people who move the needle."
        />
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium">About this event</label>
          <Button type="button" variant="outline" size="sm" onClick={draft} disabled={drafting || pending}>
            <Sparkles /> {drafting ? "Drafting…" : description ? "Rewrite with AI" : "Draft with AI"}
          </Button>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          placeholder="Tell attendees what to expect — the story, the speakers, why it matters. Blank lines create paragraphs."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="size-4" /> Saved — your page is updated
          </span>
        )}
        <Button type="button" onClick={save} disabled={pending || !dirty || !name.trim()}>
          {pending ? "Saving…" : "Save page content"}
        </Button>
      </div>
    </div>
  );
}
