"use client";

import { useRef, useState, useTransition } from "react";
import { GripVertical, Trash2, Plus, ChevronUp, ChevronDown, Pencil, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field as FormField } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FIELD_TYPES, isChoiceType, type FieldDTO, type SuggestedField } from "@/lib/registration-fields";
import type { FieldActionState } from "./actions";

type Action = (prev: FieldActionState, fd: FormData) => Promise<FieldActionState>;
type ReorderAction = (eventId: string, orderedIds: string[]) => Promise<FieldActionState>;
type AddManyAction = (eventId: string, items: { label: string; type: string; options: string[] }[]) => Promise<FieldActionState>;

export function FieldBuilder({
  eventId,
  initial,
  suggestions,
  addAction,
  addManyAction,
  updateAction,
  deleteAction,
  requiredAction,
  reorderAction,
}: {
  eventId: string;
  initial: FieldDTO[];
  suggestions: SuggestedField[];
  addAction: Action;
  addManyAction: AddManyAction;
  updateAction: Action;
  deleteAction: Action;
  requiredAction: Action;
  reorderAction: ReorderAction;
}) {
  const [fields, setFields] = useState<FieldDTO[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function persistOrder(next: FieldDTO[], prev: FieldDTO[]) {
    setFields(next); // optimistic
    startTransition(async () => {
      const res = await reorderAction(eventId, next.map((f) => f.id));
      if (res?.error) {
        setFields(prev);
        setError(res.error);
      } else {
        setError(null);
        if (res?.fields) setFields(res.fields);
      }
    });
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    persistOrder(next, fields);
  }

  function onDrop(target: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragging(null);
    if (from === null || from === target) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    persistOrder(next, fields);
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

  // Suggestions not already added (compared by label).
  const existingLabels = new Set(fields.map((f) => f.label.toLowerCase()));
  const freshSuggestions = suggestions.filter((s) => !existingLabels.has(s.label.toLowerCase()));

  function addSuggestion(s: SuggestedField) {
    setError(null);
    startTransition(async () => {
      apply(await addManyAction(eventId, [{ label: s.label, type: s.type, options: s.options }]));
    });
  }
  function addAllSuggestions() {
    setError(null);
    startTransition(async () => {
      apply(await addManyAction(eventId, freshSuggestions.map((s) => ({ label: s.label, type: s.type, options: s.options }))));
    });
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No custom questions yet. Add one below or pick from the AI suggestions — attendees answer these when they register.
        </p>
      )}

      <ul className="space-y-2">
        {fields.map((f, i) =>
          editingId === f.id ? (
            <li key={f.id} className="rounded-lg border bg-secondary/30 p-3">
              <EditFieldForm
                eventId={eventId}
                field={f}
                updateAction={updateAction}
                pending={pending}
                startTransition={startTransition}
                onDone={(res) => {
                  if (apply(res)) setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={f.id}
              draggable={!pending}
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
                "flex items-center justify-between gap-2 rounded-lg border bg-card p-3 " +
                (dragging === i ? "opacity-50 " : "")
              }
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={pending || i === 0}
                    aria-label="Move up"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={pending || i === fields.length - 1}
                    aria-label="Move down"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </span>
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.label}</span>
                  {isChoiceType(f.type) && f.options.length > 0 && (
                    <span className="block truncate text-xs text-muted-foreground">{f.options.join(" · ")}</span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge tone="neutral">{FIELD_TYPES[f.type as keyof typeof FIELD_TYPES] ?? f.type}</Badge>
                <button
                  type="button"
                  onClick={() => toggleRequired(f)}
                  disabled={pending}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  aria-label={f.required ? "Make optional" : "Make required"}
                >
                  <Badge tone={f.required ? "primary" : "neutral"}>{f.required ? "Required" : "Optional"}</Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setEditingId(f.id);
                  }}
                  disabled={pending}
                  aria-label={`Edit ${f.label}`}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  <Pencil className="size-4" />
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
          ),
        )}
      </ul>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <AddFieldForm
        eventId={eventId}
        addAction={addAction}
        onAdded={(res) => apply(res)}
        pending={pending}
        startTransition={startTransition}
      />

      {freshSuggestions.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> Suggested questions
            </p>
            <Button type="button" size="sm" variant="outline" onClick={addAllSuggestions} disabled={pending}>
              <Plus /> Add all
            </Button>
          </div>
          <ul className="space-y-1.5">
            {freshSuggestions.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {FIELD_TYPES[s.type]}
                    {s.options.length > 0 ? ` · ${s.options.join(" / ")}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => addSuggestion(s)}
                  disabled={pending}
                  aria-label={`Add "${s.label}"`}
                  className="flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isChoiceType(type)) {
              e.preventDefault();
              if (label.trim()) submit();
            }
          }}
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

function EditFieldForm({
  eventId,
  field,
  updateAction,
  pending,
  startTransition,
  onDone,
  onCancel,
}: {
  eventId: string;
  field: FieldDTO;
  updateAction: Action;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  onDone: (res: FieldActionState) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(field.required);
  const [options, setOptions] = useState(field.options.join("\n"));
  const choice = isChoiceType(field.type);

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("fieldId", field.id);
      fd.set("label", label);
      fd.set("required", String(required));
      fd.set("options", options);
      onDone(await updateAction(null, fd));
    });
  }

  return (
    <div className="space-y-3">
      <FormField label="Question / label">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </FormField>
      {choice && (
        <FormField label="Options" hint="One per line, or comma-separated.">
          <Textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3} />
        </FormField>
      )}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="size-4 accent-[hsl(243_75%_59%)]"
          />
          Required
        </label>
        <span className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending || !label.trim()}>
            <Check /> Save
          </Button>
        </span>
      </div>
    </div>
  );
}
