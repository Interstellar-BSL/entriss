import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

function formatTime(value: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CheckedInPanel({ visits }: { visits: VisitWithRelations[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Checked in now</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
            No visitors checked in right now.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between gap-3 px-5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {visit.visitor.firstName} {visit.visitor.lastName}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {visit.branch.name}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <StatusBadge status={visit.status} />
                  <span className="text-xs text-[var(--muted)]">
                    {formatTime(visit.checkedInAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
