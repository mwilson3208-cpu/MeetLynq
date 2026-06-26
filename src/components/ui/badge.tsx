import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  primary: "bg-accent text-accent-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/12 text-destructive",
  info: "bg-sky-100 text-sky-700",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
