import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Download link for a CSV export. A plain anchor (not next/link) so the browser
 * performs a full navigation and receives the file attachment.
 */
export function ExportButton({
  eventId,
  type,
  label = "Export CSV",
  variant = "outline",
  size = "sm",
}: {
  eventId: string;
  type: "attendees" | "leads" | "participants" | "companies" | "speakers" | "sponsors" | "exhibitors";
  label?: string;
  variant?: "outline" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <a
      href={`/api/events/${eventId}/export?type=${type}`}
      className={cn(buttonVariants({ variant, size }))}
      download
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}
