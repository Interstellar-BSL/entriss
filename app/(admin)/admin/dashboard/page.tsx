import { AdminDashboardStats } from "@/components/admin/admin-dashboard-stats";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Platform dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Overview of tenant organizations and onboarding requests.
        </p>
      </div>
      <AdminDashboardStats />
    </div>
  );
}
