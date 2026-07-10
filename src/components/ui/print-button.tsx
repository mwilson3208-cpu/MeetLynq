"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog (print-to-PDF) for the current page. */
export function PrintButton({ label = "Print", className }: { label?: string; className?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => window.print()}>
      <Printer className="size-4" /> {label}
    </Button>
  );
}
