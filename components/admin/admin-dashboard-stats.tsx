"use client";

import { useEffect, useState } from "react";

import { AdminDataUnavailableBanner } from "@/components/admin/admin-data-unavailable-banner";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminDashboardMetrics, type PlatformDashboardMetrics } from "@/lib/api/admin";

export function AdminDashboardStats() {
  const [metrics, setMetrics] = useState<PlatformDashboardMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void getAdminDashboardMetrics()
      .then((data) => {
        setMetrics(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load metrics");
      });
  }, []);

  if (!metrics && !loadError) {
    return <p className="text-sm text-[var(--muted)]">Loading metrics…</p>;
  }

  const organizationCards = [
    { label: "Total organizations", value: metrics?.totalOrganizations ?? "—" },
    { label: "Pending requests", value: metrics?.pendingRequests ?? "—" },
    { label: "Approved organizations", value: metrics?.approvedOrganizations ?? "—" },
    { label: "Suspended organizations", value: metrics?.suspendedOrganizations ?? "—" },
  ];

  const usageCards = [
    { label: "Total visitors", value: metrics?.usage.totalVisitors ?? "—" },
    { label: "Total visits", value: metrics?.usage.totalVisits ?? "—" },
    { label: "Active organizations", value: metrics?.usage.activeOrganizations ?? "—" },
  ];

  return (
    <div className="space-y-8">
      {loadError ? (
        <AdminDataUnavailableBanner message="Some data is temporarily unavailable. Metrics below may be incomplete." />
      ) : null}
      {metrics?.degraded ? <AdminDataUnavailableBanner /> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Organizations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {organizationCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="py-5">
                <p className="text-sm text-[var(--muted)]">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Usage
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {usageCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="py-5">
                <p className="text-sm text-[var(--muted)]">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Health
        </h2>
        <Card>
          <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-[var(--muted)]">System status</p>
              <p className="mt-1 font-medium capitalize text-[var(--foreground)]">
                {metrics?.health.systemStatus ?? "unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Last organization created</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">
                {metrics?.health.lastOrganizationName ?? "—"}
              </p>
              {metrics?.health.lastOrganizationCreatedAt ? (
                <p className="text-xs text-[var(--muted)]">
                  {new Date(metrics.health.lastOrganizationCreatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Last login</p>
              <p className="mt-1 font-medium text-[var(--foreground)]">
                {metrics?.health.lastLoginEmail ?? "—"}
              </p>
              {metrics?.health.lastLoginAt ? (
                <p className="text-xs text-[var(--muted)]">
                  {new Date(metrics.health.lastLoginAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
