import { cn } from "@/lib/utils/cn";

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h3>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-1">
        {children}
      </div>
    </section>
  );
}

export function SummaryStatusCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "muted" | "danger";
}) {
  const toneStyles = {
    default: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    muted: "border-[var(--border)] bg-[var(--card)] text-[var(--muted)]",
    danger: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        toneStyles[tone],
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}
