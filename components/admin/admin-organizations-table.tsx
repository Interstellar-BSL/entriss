"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminDataUnavailableBanner } from "@/components/admin/admin-data-unavailable-banner";
import { listAdminOrganizations, type PlatformOrganizationSummary } from "@/lib/api/admin";
import { StatusBadge } from "@/components/ui/badge";

export function AdminOrganizationsTable() {
  const [items, setItems] = useState<PlatformOrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listAdminOrganizations()
      .then((data) => {
        setItems(data.items);
        setDegraded(Boolean(data.degraded));
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load organizations");
        setDegraded(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading organizations…</p>;
  }

  return (
    <div className="space-y-4">
      {degraded || error ? <AdminDataUnavailableBanner /> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Organization</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Users</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-[var(--foreground)]">{item.userCount}</td>
              <td className="px-4 py-3 text-[var(--muted)]">
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/organizations/${item.id}`}
                  className="text-sm font-medium text-[var(--foreground)] hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
