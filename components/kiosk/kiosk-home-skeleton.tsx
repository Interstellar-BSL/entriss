export function KioskHomeSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[var(--surface-muted)]/80 to-[var(--card)]">
      <header className="shrink-0 px-8 pb-4 pt-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            <div className="space-y-3">
              <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
              <div className="h-5 w-72 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            </div>
          </div>
          <div className="hidden space-y-2 sm:block">
            <div className="ml-auto h-8 w-24 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-4 w-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          </div>
        </div>
      </header>
      <main className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-3 gap-5 px-6 pb-8">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="animate-pulse rounded-[1.75rem] border-2 border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[var(--surface-muted)]" />
            <div className="mx-auto mt-8 h-7 w-32 rounded-lg bg-[var(--surface-muted)]" />
            <div className="mx-auto mt-4 h-4 w-40 rounded-lg bg-[var(--surface-muted)]" />
          </div>
        ))}
      </main>
    </div>
  );
}
