"use client";

import { useState, useTransition } from "react";
import type { RegistrationSettingKey, ToggleState } from "./settings";

/**
 * An interactive on/off switch for a single registration setting. Flips
 * optimistically on click and persists via the server action, reverting if the
 * save fails. Renders as a real <button role="switch"> so it's keyboard- and
 * screen-reader-accessible.
 */
export function SettingToggle({
  eventId,
  settingKey,
  title,
  desc,
  initial,
  action,
}: {
  eventId: string;
  settingKey: RegistrationSettingKey;
  title: string;
  desc: string;
  initial: boolean;
  action: (prev: ToggleState, fd: FormData) => Promise<ToggleState>;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("key", settingKey);
      fd.set("enabled", String(next));
      const res = await action(null, fd);
      if (res?.error) {
        setEnabled(!next); // revert
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg p-2.5 hover:bg-secondary/50">
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
        {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={toggle}
        disabled={pending}
        className={
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 " +
          (enabled ? "bg-primary" : "bg-secondary")
        }
      >
        <span
          className={
            "inline-block size-5 transform rounded-full bg-white shadow transition-transform " +
            (enabled ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
