"use client";

import { useState } from "react";

import { InviteListTable } from "@/components/settings/invites/invite-list-table";
import { InviteUserForm } from "@/components/settings/invites/invite-user-form";

export function InvitesPanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Invite user</h2>
          <p className="text-sm text-[var(--muted)]">
            Send a secure, time-bound invitation. Users cannot join without an invite.
          </p>
        </div>
        <InviteUserForm onCreated={() => setRefreshKey((value) => value + 1)} />
      </section>

      <section className="space-y-3" key={refreshKey}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Invitations
        </h3>
        <InviteListTable />
      </section>
    </div>
  );
}
