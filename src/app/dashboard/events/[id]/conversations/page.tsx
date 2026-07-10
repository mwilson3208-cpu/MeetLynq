import Link from "next/link";
import { MessagesSquare, Send, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { formatTime, cn } from "@/lib/utils";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field, Select, Textarea } from "@/components/ui/input";
import { FormDialog } from "@/components/ui/form-dialog";
import { sendMessage, startConversation } from "./actions";

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await getEventOr404(id);

  const [conversations, participants] = await Promise.all([
    db.conversation.findMany({
      where: { eventId: id },
      include: {
        members: { include: { participant: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.participant.findMany({ where: { eventId: id }, orderBy: { name: "asc" }, select: { id: true, name: true, companyName: true } }),
  ]);

  const participantOptions = (name: string) => (
    <Select name={name} defaultValue="" required>
      <option value="" disabled>
        Choose a participant
      </option>
      {participants.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.companyName ? ` · ${p.companyName}` : ""}
        </option>
      ))}
    </Select>
  );

  const newConversationDialog = (
    <FormDialog
      buttonLabel="New message"
      title="Start a conversation"
      description="Open a private thread between two participants."
      action={startConversation}
      submitLabel="Start conversation"
      buttonSize="sm"
    >
      <input type="hidden" name="eventId" value={id} />
      <Field label="Participant A">{participantOptions("participantAId")}</Field>
      <Field label="Participant B">{participantOptions("participantBId")}</Field>
      <Field label="First message" hint="Optional.">
        <Textarea name="message" rows={2} placeholder="Say hello…" />
      </Field>
    </FormDialog>
  );

  const moderationNote = (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
          <ShieldAlert className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Moderation &amp; follow-ups</p>
          <p className="mt-0.5 text-muted-foreground">
            Conversations are moderated for flagged content, and automated follow-up reminders are sent to
            participants after their meetings.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Conversation center</h2>
        <p className="text-sm text-muted-foreground">Direct and group messaging between your participants.</p>
      </div>
      {newConversationDialog}
    </div>
  );

  if (conversations.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<MessagesSquare />}
          title="No conversations yet"
          description="Start a thread between two participants, or let them connect and message each other."
          action={newConversationDialog}
        />
        {moderationNote}
      </div>
    );
  }

  const active = conversations.find((c) => c.id === sp.c) ?? conversations[0];
  const activeNames = active.members.map((m) => m.participant.name).join(", ");

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation list */}
        <Card className="lg:col-span-1">
          <CardContent className="divide-y p-0">
            {conversations.map((c) => {
              const names = c.members.map((m) => m.participant.name).join(", ");
              const last = c.messages[c.messages.length - 1];
              const firstMember = c.members[0]?.participant;
              const isActive = c.id === active.id;
              return (
                <Link
                  key={c.id}
                  href={`?c=${c.id}`}
                  className={cn(
                    "flex items-start gap-3 p-4 transition-colors",
                    isActive ? "bg-secondary/60" : "hover:bg-secondary/40"
                  )}
                >
                  <Avatar name={firstMember?.name ?? names ?? "?"} src={firstMember?.photoUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{names || "Conversation"}</p>
                    <p className="truncate text-xs text-muted-foreground">{last ? last.body : "No messages yet"}</p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Active thread */}
        <Card className="flex flex-col lg:col-span-2">
          <div className="border-b px-5 py-3">
            <p className="text-sm font-medium">{activeNames || "Conversation"}</p>
            <p className="text-xs text-muted-foreground">
              {active.kind === "GROUP" ? "Group conversation" : "Private conversation"}
            </p>
          </div>
          <CardContent className="flex-1 space-y-4 p-5">
            {active.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages in this thread yet.</p>
            ) : (
              active.messages.map((msg) => {
                const mine = msg.senderName === "You";
                return (
                  <div key={msg.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {!mine && <p className="mb-0.5 text-xs font-semibold opacity-80">{msg.senderName}</p>}
                      <p>{msg.body}</p>
                    </div>
                    <span className="mt-1 text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                );
              })
            )}
          </CardContent>
          <form action={sendMessage} className="flex items-center gap-2 border-t p-3">
            <input type="hidden" name="eventId" value={id} />
            <input type="hidden" name="conversationId" value={active.id} />
            <Input name="body" placeholder="Type a message…" autoComplete="off" required />
            <Button type="submit">
              <Send /> Send
            </Button>
          </form>
        </Card>
      </div>

      {moderationNote}
    </div>
  );
}
