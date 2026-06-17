import { cn } from "@/lib/utils/cn";

import {
  CardSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  PanelSkeleton,
  SkeletonBar,
  TableSkeleton,
} from "./skeletons";

export {
  CardSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  PanelSkeleton,
  SkeletonBar,
  TableSkeleton,
} from "./skeletons";

export function LoadingState({
  label = "Loading…",
  className,
  variant = "inline",
}: {
  label?: string;
  className?: string;
  /** inline = centered spinner; panel = preserves panel layout with header skeleton */
  variant?: "inline" | "panel" | "list" | "table";
}) {
  if (variant === "panel") {
    return <PanelSkeleton />;
  }

  if (variant === "list") {
    return (
      <div className={className}>
        <ListSkeleton />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={className}>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-12 text-sm text-[var(--muted)] motion-safe:animate-alive-fade-in",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
      {label}
    </div>
  );
}
