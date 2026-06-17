"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createInvite,
  listInvites,
  listMembers,
  revokeInvite,
  type OrganizationInviteSummary,
  type OrganizationMemberSummary,
} from "@/lib/api/invites";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";

const INVITE_ROLES = [
  { slug: SYSTEM_ROLE_SLUGS.ADMIN, label: "Admin" },
  { slug: SYSTEM_ROLE_SLUGS.RECEPTIONIST, label: "Receptionist" },
  { slug: SYSTEM_ROLE_SLUGS.SECURITY, label: "Security" },
  { slug: SYSTEM_ROLE_SLUGS.VIEWER, label: "Viewer" },
] as const;

export function TeamPanel() {
  const [members, setMembers] = useState<OrganizationMemberSummary[]>([]);
  const [invites, setInvites] = useState<OrganizationInviteSummary[]>([]);
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState<string>(SYSTEM_ROLE_SLUGS.VIEWER);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const [membersResult, invitesResult] = await Promise.all([
        listMembers(),
        listInvites(),
      ]);
      setMembers(membersResult.items);
      setInvites(invitesResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createInvite({ email: email.trim(), roleSlug });
      setEmail("");
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    setError(null);
    try {
      await revokeInvite(inviteId);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading team…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Invite member</h2>
          <p className="text-sm text-[var(--muted)]">
            Send an email invitation to join this organization.
          </p>
        </div>

        <form
          onSubmit={(event) => void handleInvite(event)}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <label htmlFor="invite-email" className="text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@company.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2 sm:w-44">
            <label htmlFor="invite-role" className="text-sm font-medium text-[var(--foreground)]">
              Role
            </label>
            <select
              id="invite-role"
              value={roleSlug}
              onChange={(event) => setRoleSlug(event.target.value)}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              disabled={submitting}
            >
              {INVITE_ROLES.map((role) => (
                <option key={role.slug} value={role.slug}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={submitting || !email.trim()}>
            {submitting ? "Sending…" : "Send invite"}
          </Button>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Members ({members.length})
        </h3>
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {member.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{member.email}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{member.role.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Pending invites ({invites.length})
        </h3>
        {invites.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No pending invitations.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--card)]">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{invite.email}</p>
                  <p className="text-[var(--muted)]">
                    {invite.role.name} · expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleRevoke(invite.id)}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
