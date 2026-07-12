import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MeetLynq — Meet smarter. Connect faster. Measure what matters.",
    template: "%s · MeetLynq",
  },
  description:
    "MeetLynq is the connection operating system for business events — build branded events, manage registration, schedule high-value meetings, support sponsors, and prove event ROI in one simple platform.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-full font-sans"
        style={{ ["--font-sans" as string]: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
