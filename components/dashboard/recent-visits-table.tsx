import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { kioskHostLabel } from "@/lib/kiosk/visit-display";

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getVisitTime(visit: VisitWithRelations) {
  return visit.checkedInAt ?? visit.scheduledAt ?? visit.checkedOutAt;
}

export function RecentVisitsTable({ visits }: { visits: VisitWithRelations[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent visits</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
            No visits recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-2.5 font-medium">Visitor</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="hidden px-5 py-2.5 font-medium sm:table-cell">
                    Branch
                  </th>
                  <th className="hidden px-5 py-2.5 font-medium md:table-cell">
                    Host
                  </th>
                  <th className="px-5 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-[var(--surface-muted)]">
                    <td className="px-5 py-2.5 font-medium text-[var(--foreground)]">
                      {visit.visitor.firstName} {visit.visitor.lastName}
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={visit.status} />
                    </td>
                    <td className="hidden px-5 py-2.5 text-[var(--muted)] sm:table-cell">
                      {visit.branch.name}
                    </td>
                    <td className="hidden px-5 py-2.5 text-[var(--muted)] md:table-cell">
                      {kioskHostLabel(visit)}
                    </td>
                    <td className="px-5 py-2.5 text-[var(--muted)]">
                      {formatDateTime(getVisitTime(visit))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
