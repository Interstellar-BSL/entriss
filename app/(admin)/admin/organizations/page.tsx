import { AdminOrganizationsTable } from "@/components/admin/admin-organizations-table";

export default function AdminOrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Organizations</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage tenant lifecycle across the platform.
        </p>
      </div>
      <AdminOrganizationsTable />
    </div>
  );
}
