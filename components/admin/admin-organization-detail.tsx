"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  getAdminOrganization,
  reactivateAdminOrganization,
  suspendAdminOrganization,
} from "@/lib/api/admin";

export function AdminOrganizationDetail({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminOrganization>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getAdminOrganization(organizationId)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load organization");
      });
  }, [organizationId]);

  async function handleSuspend() {
    setSubmitting(true);
    try {
      await suspendAdminOrganization(organizationId);
      const refreshed = await getAdminOrganization(organizationId);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suspend failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactivate() {
    setSubmitting(true);
    try {
      await reactivateAdminOrganization(organizationId);
      const refreshed = await getAdminOrganization(organizationId);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reactivate failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Loading organization…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{data.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{data.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={data.status} />
          {data.status === "SUSPENDED" ? (
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void handleReactivate()}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={submitting || data.status !== "APPROVED"}
              onClick={() => void handleSuspend()}
            >
              Suspend
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="font-medium text-[var(--foreground)]">Overview</h2>
            <p className="text-sm text-[var(--muted)]">
              Created {new Date(data.createdAt).toLocaleString()}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Users</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.userCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Branches</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.branchCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Visits</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.visitCount}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Status</dt>
                <dd>
                  <StatusBadge status={data.status} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 py-5">
            <h2 className="font-medium text-[var(--foreground)]">Users</h2>
            <ul className="space-y-2 text-sm text-[var(--foreground)]">
              {data.users.map((user) => (
                <li key={user.id}>
                  <span className="font-medium">{user.name ?? user.email}</span>
                  <span className="text-[var(--muted)]"> — {user.role}</span>
                  {user.lastLoginAt ? (
                    <span className="block text-xs text-[var(--muted)]">
                      Last login {new Date(user.lastLoginAt).toLocaleString()}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="font-medium text-[var(--foreground)]">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {data.recentActivity.length === 0 ? (
              <li className="text-[var(--muted)]">No recent activity</li>
            ) : (
              data.recentActivity.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-4 text-[var(--foreground)]">
                  <span>
                    {entry.action}
                    {entry.actor ? ` — ${entry.actor.email}` : ""}
                  </span>
                  <span className="shrink-0 text-[var(--muted)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
