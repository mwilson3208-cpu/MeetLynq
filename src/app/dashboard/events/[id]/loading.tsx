// Instant skeleton while an event tab renders — shows immediately on every
// tab switch (Overview, Builder, Registration, …) so clicks never feel dead.
export default function EventTabLoading() {
  return (
    <div aria-busy className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-card p-5">
            <div className="h-4 w-24 rounded bg-secondary" />
            <div className="mt-4 h-8 w-16 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-xl border bg-card lg:col-span-2" />
        <div className="space-y-6">
          <div className="h-44 rounded-xl border bg-card" />
          <div className="h-44 rounded-xl border bg-card" />
        </div>
      </div>
    </div>
  );
}
