"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import {
  listInvites,
  resendInvite,
  revokeInvite,
  type OrganizationInviteSummary,
} from "@/lib/api/invites";

export function InviteListTable() {
  const [items, setItems] = useState<OrganizationInviteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInvites();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResend(inviteId: string) {
    setActionId(inviteId);
    try {
      await resendInvite(inviteId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setActionId(null);
    }
  }

  async function handleRevoke(inviteId: string) {
    if (!window.confirm("Revoke this invitation?")) {
      return;
    }
    setActionId(inviteId);
    try {
      await revokeInvite(inviteId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading invitations…</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Expires</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  No invitations yet
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-[var(--foreground)]">{item.email}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{item.role.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(item.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={actionId === item.id}
                          onClick={() => void handleResend(item.id)}
                        >
                          Resend
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={actionId === item.id}
                          onClick={() => void handleRevoke(item.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
