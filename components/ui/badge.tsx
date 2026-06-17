import { cn } from "@/lib/utils/cn";

const statusStyles: Record<string, string> = {
  SUSPENDED:
    "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-blue-50 text-blue-800 ring-blue-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  CHECKED_IN: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CHECKED_OUT:
    "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
  DISABLED:
    "bg-[var(--surface-muted)] text-[var(--muted)] ring-[var(--border)]",
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status] ??
          "bg-[var(--surface-muted)] text-[var(--foreground)] ring-[var(--border)]",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
