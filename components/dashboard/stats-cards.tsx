import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  description: string;
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 py-4">
        <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
        <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {value}
        </p>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({
  pendingVisitsCount,
  approvedVisitsCount,
  checkedInCount,
  checkedOutCount,
  rejectedVisitsCount,
}: {
  pendingVisitsCount: number;
  approvedVisitsCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  rejectedVisitsCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Pending visits"
        value={pendingVisitsCount}
        description="Awaiting approval"
      />
      <StatCard
        label="Approved visits"
        value={approvedVisitsCount}
        description="Ready to check in"
      />
      <StatCard
        label="Checked-in visitors"
        value={checkedInCount}
        description="Currently on-site"
      />
      <StatCard
        label="Checked-out visitors"
        value={checkedOutCount}
        description="Completed visits"
      />
      <StatCard
        label="Rejected visits"
        value={rejectedVisitsCount}
        description="Denied requests"
      />
    </div>
  );
}
