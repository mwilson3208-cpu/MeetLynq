import { Search, Plus, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

export function Topbar({ userName, orgName }: { userName: string; orgName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur lg:px-6">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search events, attendees, companies…"
            className="h-9 w-full rounded-lg border border-input bg-secondary/50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <ButtonLink href="/dashboard/events/new" size="sm" className="hidden sm:inline-flex">
        <Plus className="size-4" /> New event
      </ButtonLink>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{userName}</p>
          <p className="text-xs text-muted-foreground">{orgName}</p>
        </div>
        <Avatar name={userName} size={36} />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
