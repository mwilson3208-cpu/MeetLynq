// Instant skeleton while any dashboard page renders on the server — without
// this, clicks give no feedback until the full response arrives.
export default function DashboardLoading() {
  return (
    <div aria-busy className="animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-7 w-64 rounded-lg bg-secondary" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-secondary/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-card p-5">
            <div className="h-4 w-24 rounded bg-secondary" />
            <div className="mt-4 h-8 w-16 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border bg-card" />
          ))}
        </div>
        <div className="h-64 rounded-xl border bg-card" />
      </div>
    </div>
  );
}
