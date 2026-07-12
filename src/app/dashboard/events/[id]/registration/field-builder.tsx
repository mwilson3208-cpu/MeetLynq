"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field as FormField } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FIELD_TYPES, isChoiceType, type FieldDTO } from "@/lib/registration-fields";
import type { FieldActionState } from "./actions";

type Action = (prev: FieldActionState, fd: FormData) => Promise<FieldActionState>;

export function FieldBuilder({
  eventId,
  initial,
  addAction,
  deleteAction,
  requiredAction,
  reorderAction,
}: {
  eventId: string;
  initial: FieldDTO[];
  addAction: Action;
  deleteAction: Action;
  requiredAction: Action;
  reorderAction: (eventId: string, orderedIds: string[]) => Promise<FieldActionState>;
}) {
  const [fields, setFields] = useState<FieldDTO[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function apply(res: FieldActionState) {
    if (res?.error) {
      setError(res.error);
      return false;
    }
    setError(null);
    if (res?.fields) setFields(res.fields);
    return true;
  }

  // --- drag to reorder ------------------------------------------------------
  function onDrop(target: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragging(null);
    if (from === null || from === target) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    const prev = fields;
    setFields(next); // optimistic
    startTransition(async () => {
      const res = await reorderAction(eventId, next.map((f) => f.id));
      if (res?.error) {
        setFields(prev); // revert
        setError(res.error);
      } else {
        setError(null);
        if (res?.fields) setFields(res.fields);
      }
    });
  }

  function remove(fieldId: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("fieldId", fieldId);
      apply(await deleteAction(null, fd));
    });
  }

  function toggleRequired(field: FieldDTO) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("fieldId", field.id);
      fd.set("required", String(!field.required));
      apply(await requiredAction(null, fd));
    });
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No custom fields yet. Add one below — attendees answer these on the registration form.
        </p>
      )}

      <ul className="space-y-2">
        {fields.map((f, i) => (
          <li
            key={f.id}
            draggable
            onDragStart={() => {
              dragFrom.current = i;
              setDragging(i);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            onDragEnd={() => {
              dragFrom.current = null;
              setDragging(null);
            }}
            className={
              "flex items-center justify-between gap-3 rounded-lg border bg-card p-3 " +
              (dragging === i ? "opacity-50 " : "") +
              (pending ? "" : "cursor-grab")
            }
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{f.label}</span>
                {isChoiceType(f.type) && f.options.length > 0 && (
                  <span className="block truncate text-xs text-muted-foreground">{f.options.join(" · ")}</span>
                )}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge tone="neutral">{FIELD_TYPES[f.type as keyof typeof FIELD_TYPES] ?? f.type}</Badge>
              <button
                type="button"
                onClick={() => toggleRequired(f)}
                disabled={pending}
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={f.required ? "Make optional" : "Make required"}
              >
                <Badge tone={f.required ? "primary" : "neutral"}>{f.required ? "Required" : "Optional"}</Badge>
              </button>
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={pending}
                aria-label={`Delete ${f.label}`}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AddFieldForm
        eventId={eventId}
        addAction={addAction}
        onAdded={(res) => apply(res)}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  );
}

function AddFieldForm({
  eventId,
  addAction,
  onAdded,
  pending,
  startTransition,
}: {
  eventId: string;
  addAction: Action;
  onAdded: (res: FieldActionState) => boolean;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("TEXT");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("label", label);
      fd.set("type", type);
      fd.set("required", String(required));
      fd.set("options", options);
      const ok = onAdded(await addAction(null, fd));
      if (ok) {
        setLabel("");
        setOptions("");
        setRequired(false);
        setType("TEXT");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Add custom field
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
      <FormField label="Question / label">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are you hoping to get out of this event?"
          autoFocus
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Field type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(FIELD_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="size-4 accent-[hsl(243_75%_59%)]"
          />
          Required
        </label>
      </div>
      {isChoiceType(type) && (
        <FormField label="Options" hint="One per line, or comma-separated.">
          <Textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            rows={3}
            placeholder={"Founder / CEO\nInvestor\nOperator"}
          />
        </FormField>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={pending || !label.trim()}>
          {pending ? "Adding…" : "Add field"}
        </Button>
      </div>
    </div>
  );
}
