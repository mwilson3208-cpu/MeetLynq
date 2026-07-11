import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** Branded 404 — shown for unknown routes and notFound() (e.g. events you don't own). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <SearchX className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist — or you don&apos;t have access to it. Check the link, or head
          back to somewhere familiar.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink href="/" variant="outline">
            MeetLynq home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
