import { InvitesPanel } from "@/components/settings/invites/invites-panel";

export default function OrganizationInvitesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Team invitations
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage secure invite links for your organization
        </p>
      </div>
      <InvitesPanel />
    </div>
  );
}
