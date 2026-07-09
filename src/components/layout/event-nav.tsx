"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { seg: "", label: "Overview" },
  { seg: "builder", label: "Builder" },
  { seg: "registration", label: "Registration" },
  { seg: "tickets", label: "Tickets" },
  { seg: "attendees", label: "Attendees" },
  { seg: "check-in", label: "Check-in" },
  { seg: "badges", label: "Badges" },
  { seg: "agenda", label: "Agenda" },
  { seg: "speakers", label: "Speakers" },
  { seg: "directory", label: "Directory" },
  { seg: "companies", label: "Companies" },
  { seg: "marketplace", label: "Marketplace" },
  { seg: "matchmaking", label: "Matchmaking" },
  { seg: "meetings", label: "Meetings" },
  { seg: "conversations", label: "Conversations" },
  { seg: "sponsors", label: "Sponsors" },
  { seg: "exhibitors", label: "Exhibitors" },
  { seg: "emails", label: "Emails" },
  { seg: "surveys", label: "Surveys" },
  { seg: "reports", label: "Reports" },
  { seg: "settings", label: "Settings" },
];

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;
  return (
    <div className="-mx-4 mb-6 overflow-x-auto border-b px-4 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const href = t.seg ? `${base}/${t.seg}` : base;
          const active = t.seg ? pathname.startsWith(href) : pathname === base;
          return (
            <Link
              key={t.seg || "overview"}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
