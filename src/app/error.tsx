"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Root error boundary — catches anything a page, layout, or form action
 * throws that wasn't handled closer to the source, and offers a retry
 * instead of Next.js's raw digest screen.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
          <TriangleAlert className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          An unexpected error interrupted this page. Your data is safe — try again, and if the
          problem sticks around, head back to the dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RotateCcw className="size-4" /> Try again
          </Button>
          <ButtonLink href="/dashboard" variant="outline">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
