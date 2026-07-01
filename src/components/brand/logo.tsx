import Link from "next/link";
import { cn } from "@/lib/utils";

/** MeetLynq mark: two linked nodes forming an "L" link — original, not derived
 *  from any other event platform's branding. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="hsl(243 75% 59%)" />
      <circle cx="11" cy="11" r="3.4" fill="white" />
      <circle cx="21" cy="21" r="3.4" fill="white" />
      <path d="M11 14.4V21h6.6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  textClassName,
}: {
  className?: string;
  href?: string;
  textClassName?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("text-lg font-bold tracking-tight", textClassName)}>
        Meet<span className="text-primary">Lynq</span>
      </span>
    </Link>
  );
}
