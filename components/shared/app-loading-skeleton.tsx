"use client";

export function AppLoadingSkeleton() {
  const navRows = Array.from({ length: 10 }, (_, index) => index);
  const cards = Array.from({ length: 6 }, (_, index) => index);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/70" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2 p-3">
          {navRows.map((row) => (
            <div key={row} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </aside>

      <section className="min-h-screen lg:pl-72">
        <header className="flex h-14 items-center justify-between border-b bg-background/90 px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-primary/70" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-lg bg-primary/40" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl border bg-card" />
            <div className="h-24 animate-pulse rounded-xl border bg-card" />
            <div className="h-24 animate-pulse rounded-xl border bg-card" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-4 h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-72 animate-pulse rounded-lg bg-muted/70" />
            </div>
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              {cards.slice(0, 4).map((card) => (
                <div key={card} className="h-16 animate-pulse rounded-lg border bg-background" />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card} className="h-28 animate-pulse rounded-xl border bg-card" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
