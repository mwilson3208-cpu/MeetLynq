import { Bell, CheckCheck, Calendar, UserPlus, Settings } from "lucide-react";
import { requireOrg } from "@/lib/queries";
import { db } from "@/lib/db";
import { PageHeader, EmptyState, Separator } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tone } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const KINDS: Record<string, { label: string; tone: Tone }> = {
  INFO: { label: "Info", tone: "info" },
  MEETING: { label: "Meeting", tone: "primary" },
  REGISTRATION: { label: "Registration", tone: "success" },
  SYSTEM: { label: "System", tone: "neutral" },
};

const PREFS: { group: string; items: string[] }[] = [
  { group: "Channels", items: ["Email", "Push (PWA)", "SMS-ready"] },
  { group: "Categories", items: ["Registrations", "Meetings", "System"] },
];

export default async function NotificationsPage() {
  const { user } = await requireOrg();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.` : "Stay on top of activity across your events."}
        action={
          <Button variant="outline" disabled={unread === 0}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell />}
              title="You're all caught up"
              description="New registrations, meeting requests, and system updates will show up here."
            />
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {notifications.map((n) => {
                  const kind = KINDS[n.kind] ?? { label: n.kind, tone: "neutral" as Tone };
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 p-4 ${n.read ? "" : "bg-accent/40"}`}
                    >
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{n.title}</p>
                          <Badge tone={kind.tone}>{kind.label}</Badge>
                        </div>
                        {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-4 text-primary" /> Preferences
              </CardTitle>
              <CardDescription>Choose how and when you hear from us.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {PREFS.map((section, si) => (
                <div key={section.group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.group}
                  </p>
                  <div className="space-y-2.5">
                    {section.items.map((item, i) => (
                      <label key={item} className="flex cursor-pointer items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {section.group === "Categories" && i === 0 && <UserPlus className="size-4 text-muted-foreground" />}
                          {section.group === "Categories" && i === 1 && <Calendar className="size-4 text-muted-foreground" />}
                          {section.group === "Categories" && i === 2 && <Settings className="size-4 text-muted-foreground" />}
                          {item}
                        </span>
                        <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary">
                          <span className="absolute right-0.5 size-4 rounded-full bg-white shadow" />
                        </span>
                      </label>
                    ))}
                  </div>
                  {si < PREFS.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
