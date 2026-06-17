import { AdminOrganizationRequests } from "@/components/admin/admin-organization-requests";

export default function AdminOrgRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Organization requests</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Review, approve, or reject new tenant onboarding requests.
        </p>
      </div>
      <AdminOrganizationRequests />
    </div>
  );
}
