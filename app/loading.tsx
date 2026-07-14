export default function Loading() {
  return (
    <div className="min-h-[70vh] pt-28 px-6" role="status" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="mx-auto h-10 w-56 rounded-xl bg-primary/10" />
        <div className="mx-auto h-5 w-96 max-w-full rounded-lg bg-border" />
        <div className="grid gap-5 pt-8 md:grid-cols-3">
          <div className="h-44 rounded-2xl bg-white/70 border border-border" />
          <div className="h-44 rounded-2xl bg-white/70 border border-border md:col-span-2" />
        </div>
      </div>
    </div>
  );
}
