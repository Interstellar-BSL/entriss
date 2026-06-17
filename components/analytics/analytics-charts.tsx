"use client";

import { cn } from "@/lib/utils/cn";

export function AnalyticsBarChart({
  data,
  valueKey,
  labelKey,
  className,
}: {
  data: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
  className?: string;
}) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => Number(item[valueKey] ?? 0)),
  );

  return (
    <div className={cn("space-y-2", className)}>
      {data.length === 0 ? (
        <p className="rounded-md border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
          No data for this range
        </p>
      ) : (
        data.map((item) => {
          const value = Number(item[valueKey] ?? 0);
          const width = `${Math.max(4, Math.round((value / maxValue) * 100))}%`;

          return (
            <div key={String(item[labelKey])} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2">
              <span className="truncate text-xs text-[var(--muted)]">{item[labelKey]}</span>
              <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-2 rounded-full bg-[var(--brand-primary)]"
                  style={{ width }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-[var(--foreground)]">
                {value}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export function AnalyticsTrendChart({
  points,
}: {
  points: Array<{
    date: string;
    total: number;
  }>;
}) {
  const maxValue = Math.max(1, ...points.map((point) => point.total));
  const chartHeightPx = 128;
  const labelStride =
    points.length <= 14 ? 1 : Math.ceil(points.length / 7);

  return (
    <div className="flex gap-0.5 border-b border-[var(--border)] pb-2">
      {points.length === 0 ? (
        <p className="flex h-32 w-full items-center justify-center text-xs text-[var(--muted)]">
          No trend data
        </p>
      ) : (
        points.map((point, index) => {
          const barHeightPx =
            point.total === 0
              ? 2
              : Math.max(4, Math.round((point.total / maxValue) * chartHeightPx));
          const showLabel =
            index % labelStride === 0 || index === points.length - 1;

          return (
            <div
              key={point.date}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${point.date}: ${point.total} visit${point.total === 1 ? "" : "s"}`}
            >
              <div
                className="flex w-full items-end justify-center"
                style={{ height: chartHeightPx }}
              >
                <div
                  className="w-full min-w-[2px] max-w-full rounded-t bg-[var(--brand-primary)]/90 transition-colors group-hover:bg-[var(--brand-primary-hover)]"
                  style={{ height: barHeightPx }}
                />
              </div>
              <span
                className={cn(
                  "truncate text-[9px] text-[var(--muted)]",
                  !showLabel && "invisible",
                )}
                aria-hidden={!showLabel}
              >
                {point.date.slice(5)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
