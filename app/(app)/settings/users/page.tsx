import { UsersPanel } from "@/components/settings/users-panel";

export default function OrganizationUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Organization users
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage users within your organization
        </p>
      </div>
      <UsersPanel />
    </div>
  );
}
