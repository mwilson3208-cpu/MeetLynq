"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = { ok?: boolean; error?: string } | null;

const PRESETS = ["#4f46e5", "#0ea5e9", "#059669", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#0f172a"];

/**
 * Inline brand-color editor for the Builder's Brand card. Pick from presets or
 * the native color input; Save persists and the page revalidates (updating the
 * live preview above).
 */
export function BrandColorPicker({
  eventId,
  initial,
  action,
}: {
  eventId: string;
  initial: string;
  action: (prev: State, fd: FormData) => Promise<State>;
}) {
  const [color, setColor] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = color.toLowerCase() !== initial.toLowerCase();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("brandColor", color);
      const res = await action(null, fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label
          className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border"
          style={{ backgroundColor: color }}
          title="Pick a custom color"
        >
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label="Brand color"
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Brand color</p>
          <p className="text-xs uppercase text-muted-foreground">{color}</p>
        </div>
        {dirty && (
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-sm text-success">
            <Check className="size-4" /> Saved
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setColor(p)}
            aria-label={`Use ${p}`}
            className={
              "size-6 rounded-md border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
              (color.toLowerCase() === p ? "ring-2 ring-primary ring-offset-1" : "")
            }
            style={{ backgroundColor: p }}
          />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
