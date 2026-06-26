"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  Plug,
  ShieldCheck,
  Bell,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/community", label: "Community", icon: Users },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

const settingsNav = [
  { href: "/dashboard/team", label: "Team & roles", icon: ShieldCheck },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href, item.exact)} />
        ))}
        <div className="my-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </div>
        {settingsNav.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
        <div className="mt-auto rounded-xl bg-accent p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
            <Megaphone className="size-4" /> Launch faster
          </div>
          <p className="mt-1 text-xs text-accent-foreground/80">
            Use the AI setup assistant to build your next event in minutes.
          </p>
          <Link
            href="/dashboard/events/new"
            className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
          >
            Create event →
          </Link>
        </div>
      </nav>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
