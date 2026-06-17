import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-muted)] skeleton-shimmer",
        className,
      )}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <SkeletonBar className="h-7 w-40" />
      <SkeletonBar className="h-4 w-64" />
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/50 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <SkeletonBar key={index} className="h-3 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <SkeletonBar
                key={colIndex}
                className={cn("h-4", colIndex === 0 ? "w-4/5" : "w-full")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-4"
        >
          <SkeletonBar className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-4 w-1/3" />
            <SkeletonBar className="h-3 w-full" />
            <SkeletonBar className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <SkeletonBar className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonBar key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <PageHeaderSkeleton />
      <CardSkeleton lines={4} />
    </div>
  );
}
