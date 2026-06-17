import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-36 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-[var(--surface-muted)]" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 py-1"
          >
            <div className="space-y-2">
              <div className="h-3.5 w-40 animate-pulse rounded bg-[var(--surface-muted)]" />
              <div className="h-3 w-56 animate-pulse rounded bg-[var(--surface-muted)]" />
            </div>
            <div className="h-6 w-11 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function BranchOperationalSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-[var(--surface-muted)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--surface-muted)]" />
      </div>
      <SectionSkeleton />
      <SectionSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  );
}
