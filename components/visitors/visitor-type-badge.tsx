import type { VisitorType } from "@/lib/api/visitors";
import { cn } from "@/lib/utils/cn";

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  FIRST_TIME: "First time",
  RETURNING: "Returning",
  FREQUENT: "Frequent",
  VIP: "VIP",
  DORMANT: "Dormant",
};

export const VISITOR_TYPE_STYLES: Record<VisitorType, string> = {
  FIRST_TIME: "bg-sky-50 text-sky-700 ring-sky-100",
  RETURNING: "bg-blue-50 text-[var(--link)] ring-blue-100",
  FREQUENT: "bg-violet-50 text-violet-700 ring-violet-100",
  VIP: "bg-amber-50 text-amber-800 ring-amber-100",
  DORMANT: "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
};

export function VisitorTypeBadge({ type }: { type: VisitorType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        VISITOR_TYPE_STYLES[type],
      )}
    >
      {VISITOR_TYPE_LABELS[type]}
    </span>
  );
}
