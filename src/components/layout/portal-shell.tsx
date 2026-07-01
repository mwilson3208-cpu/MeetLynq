import { Avatar } from "@/components/ui/misc";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";

// Lightweight standalone shell for the role-specific portals (speaker, sponsor,
// exhibitor). Public-style, no dashboard chrome.
export function PortalShell({
  role,
  eventName,
  userName,
  children,
}: {
  role: string;
  eventName: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo href="/" />
            <Badge tone="primary">{role}</Badge>
            <span className="hidden text-sm text-muted-foreground sm:inline">{eventName}</span>
          </div>
          <Avatar name={userName} size={36} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
