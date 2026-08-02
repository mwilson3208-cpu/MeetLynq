"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function DocsDialog() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        View docs
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="API quick reference"
        description="Authenticate with your secret key as a Bearer token."
      >
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1.5 font-medium">Export attendees (CSV)</p>
            <pre className="overflow-x-auto rounded-lg border bg-secondary/40 p-3 font-mono text-xs">
{`curl https://meetlynk.app/api/events/EVENT_ID/export?type=attendees \\
  -H "Authorization: Bearer mlq_live_..."`}
            </pre>
          </div>
          <div>
            <p className="mb-1.5 font-medium">Export types</p>
            <p className="text-muted-foreground">
              <code>attendees</code> · <code>participants</code> · <code>companies</code> · <code>leads</code>
            </p>
          </div>
          <div>
            <p className="mb-1.5 font-medium">Webhook payloads</p>
            <p className="text-muted-foreground">
              Each webhook receives a JSON POST with <code>event</code>, <code>data</code>, and a
              signature header derived from the webhook&apos;s secret.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep your secret key private — it grants full access to your workspace data.
          </p>
        </div>
      </Dialog>
    </>
  );
}
