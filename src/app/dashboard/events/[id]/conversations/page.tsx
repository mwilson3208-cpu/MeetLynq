import { MessagesSquare, Send, ShieldAlert, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getEventOr404 } from "@/lib/queries";
import { formatTime, cn } from "@/lib/utils";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getEventOr404(id);

  const conversations = await db.conversation.findMany({
    where: { eventId: id },
    include: {
      members: { include: { participant: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const moderationNote = (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
          <ShieldAlert className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Moderation &amp; follow-ups</p>
          <p className="mt-0.5 text-muted-foreground">
            Conversations are moderated for flagged content, and automated follow-up
            reminders are sent to participants after their meetings.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (conversations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Conversation center</h2>
            <p className="text-sm text-muted-foreground">
              Direct and group messaging between your participants.
            </p>
          </div>
          <Button>
            <Plus /> New message
          </Button>
        </div>
        <EmptyState
          icon={<MessagesSquare />}
          title="No conversations yet"
          description="Once participants connect and start messaging, their threads will appear here."
          action={
            <Button>
              <Plus /> New message
            </Button>
          }
        />
        {moderationNote}
      </div>
    );
  }

  const active = conversations[0];
  const activeNames = active.members.map((m) => m.participant.name).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conversation center</h2>
          <p className="text-sm text-muted-foreground">
            Direct and group messaging between your participants.
          </p>
        </div>
        <Button>
          <Plus /> New message
        </Button>
      </div>

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
                <div
                  key={c.id}
                  className={cn(
                    "flex items-start gap-3 p-4 transition-colors",
                    isActive ? "bg-secondary/60" : "hover:bg-secondary/40"
                  )}
                >
                  <Avatar
                    name={firstMember?.name ?? names ?? "?"}
                    src={firstMember?.photoUrl}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{names || "Conversation"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {last ? last.body : "No messages yet"}
                    </p>
                  </div>
                </div>
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
                  <div
                    key={msg.id}
                    className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-xs font-semibold opacity-80">
                          {msg.senderName}
                        </p>
                      )}
                      <p>{msg.body}</p>
                    </div>
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
          <div className="flex items-center gap-2 border-t p-3">
            <Input placeholder="Type a message…" disabled />
            <Button disabled>
              <Send /> Send
            </Button>
          </div>
        </Card>
      </div>

      {moderationNote}
    </div>
  );
}
