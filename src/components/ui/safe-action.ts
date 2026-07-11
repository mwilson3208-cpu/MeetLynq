"use client";

// Client-side guard for useActionState server actions. If the action throws
// unexpectedly (database outage, lost network, server crash), the form shows
// an inline error instead of Next.js's generic error page. Successful
// redirects never reject on the client, so they pass through untouched.

export const GENERIC_ACTION_ERROR =
  "Something went wrong on our end. Please try again — if it keeps happening, refresh the page.";

type StateWithError = { error?: string } | null | void;

export function withActionErrorFallback<P, S extends StateWithError>(
  action: (prev: P, fd: FormData) => Promise<S>,
  message: string = GENERIC_ACTION_ERROR
): (prev: P, fd: FormData) => Promise<S> {
  return async (prev, fd) => {
    try {
      return await action(prev, fd);
    } catch {
      return { error: message } as S;
    }
  };
}
