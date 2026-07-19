import type { Metadata } from "next";
import "./globals.css";

/**
 * Absolute base for social/OG URLs. Runs at build time, so it must never
 * throw: a misconfigured env var (e.g. NEXT_PUBLIC_APP_URL without a scheme)
 * would otherwise fail every deployment. Schemeless values are repaired.
 */
function resolveMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme);
    } catch {
      // fall through to the next candidate
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  title: {
    default: "MeetLynq — Meet smarter. Connect faster. Measure what matters.",
    template: "%s · MeetLynq",
  },
  description:
    "MeetLynq is the connection operating system for business events — build branded events, manage registration, schedule high-value meetings, support sponsors, and prove event ROI in one simple platform.",
  metadataBase: resolveMetadataBase(),
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
