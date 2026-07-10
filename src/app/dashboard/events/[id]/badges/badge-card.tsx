/** Presentational name badge with a scannable QR. `qr` is a self-contained SVG string. */
export function BadgeCard({
  eventName,
  name,
  title,
  company,
  qr,
  token,
}: {
  eventName: string;
  name: string;
  title?: string | null;
  company?: string | null;
  qr: string;
  token: string;
}) {
  return (
    <div className="badge-card flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-secondary/40 px-4 py-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eventName}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-3 p-5 text-center">
        <div
          className="flex size-24 items-center justify-center rounded-lg border bg-white p-1.5 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div>
          <p className="text-lg font-semibold leading-tight">{name}</p>
          {title && <p className="text-sm text-muted-foreground">{title}</p>}
          {company && <p className="text-sm font-medium text-foreground">{company}</p>}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">{token.slice(0, 12)}…</p>
      </div>
    </div>
  );
}
