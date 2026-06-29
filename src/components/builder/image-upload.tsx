"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ImageIcon, UploadCloud, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadState = { url?: string; error?: string } | null;
type Action = (prev: UploadState, fd: FormData) => Promise<UploadState>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <UploadCloud className="size-4" />
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}

/**
 * Real image upload backed by Supabase Storage. Shows the current image,
 * accepts a new file, and reflects the uploaded URL on success.
 */
export function ImageUpload({
  action,
  eventId,
  currentUrl,
  label = "Cover image",
  configured,
}: {
  action: Action;
  eventId: string;
  currentUrl?: string | null;
  label?: string;
  configured: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const preview = state?.url ?? currentUrl ?? null;

  return (
    <div className="space-y-3">
      <div className="flex aspect-[16/6] items-center justify-center overflow-hidden rounded-lg border bg-secondary/40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="size-6" />
            <span className="text-xs">No {label.toLowerCase()} yet</span>
          </div>
        )}
      </div>

      {configured ? (
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            required
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-secondary/80"
          />
          <SubmitButton />
        </form>
      ) : (
        <p className="rounded-lg border border-dashed bg-secondary/30 p-3 text-xs text-muted-foreground">
          Connect Supabase Storage (set the <code>SUPABASE_*</code> environment variables) to enable image uploads.
        </p>
      )}

      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state?.url && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Check className="size-3.5" /> Uploaded and saved.
        </p>
      )}
    </div>
  );
}
