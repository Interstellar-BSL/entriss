import { CheckedInPanel } from "@/components/dashboard/checked-in-panel";
import { DashboardOperationalSummary } from "@/components/dashboard/dashboard-operational-summary";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardTopHosts } from "@/components/dashboard/dashboard-top-hosts";
import { DashboardVisitorTrends } from "@/components/dashboard/dashboard-visitor-trends";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentVisitsTable } from "@/components/dashboard/recent-visits-table";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { getSessionUser } from "@/lib/auth/session";

export async function DashboardContent() {
  const user = await getSessionUser();
  const orgName = user?.organizationName ?? "your organization";

  let data = {
    pendingVisitsCount: 0,
    approvedVisitsCount: 0,
    checkedInCount: 0,
    checkedOutCount: 0,
    rejectedVisitsCount: 0,
    recentVisits: [] as Awaited<ReturnType<typeof getDashboardData>>["recentVisits"],
    checkedInVisits: [] as Awaited<ReturnType<typeof getDashboardData>>["checkedInVisits"],
  };
  let loadError: string | null = null;

  try {
    data = await getDashboardData();
  } catch {
    loadError =
      "Unable to load dashboard data. Check your permissions and try again.";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Overview for {orgName}</p>
      </div>

      {loadError ? (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {loadError}
        </p>
      ) : (
        <>
          <div className="space-y-4">
            <DashboardOperationalSummary />
            <StatsCards
              pendingVisitsCount={data.pendingVisitsCount}
              approvedVisitsCount={data.approvedVisitsCount}
              checkedInCount={data.checkedInCount}
              checkedOutCount={data.checkedOutCount}
              rejectedVisitsCount={data.rejectedVisitsCount}
            />
          </div>

          <QuickActions />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardVisitorTrends />
            </div>
            <DashboardTopHosts />
          </div>

          <DashboardRecentActivity />

          <div className="grid gap-4 lg:grid-cols-2">
            <RecentVisitsTable visits={data.recentVisits} />
            <CheckedInPanel visits={data.checkedInVisits} />
          </div>
        </>
      )}
    </div>
  );
}
