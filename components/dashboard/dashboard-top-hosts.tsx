"use client";

import { useEffect, useState } from "react";

import { AnalyticsBarChart } from "@/components/analytics/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHostAnalytics } from "@/lib/api/analytics";
import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";
import { cn } from "@/lib/utils/cn";

export function DashboardTopHosts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hosts, setHosts] = useState<
    Array<{
      hostName: string;
      totalVisits: number;
      checkedInVisits: number;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getHostAnalytics({ period: "monthly" });
        if (cancelled) {
          return;
        }

        setHosts(
          data.hosts.slice(0, 5).map((host) => ({
            hostName: host.hostName,
            totalVisits: host.totalVisits,
            checkedInVisits: host.checkedInVisits,
          })),
        );
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingErrorMessage(err, "Could not load top hosts."));
          setHosts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top hosts</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col space-y-3 pt-0">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className={cn(loading && "opacity-60")}>
              <AnalyticsBarChart
                data={hosts.map((host) => ({
                  label: host.hostName,
                  value: host.totalVisits,
                }))}
                labelKey="label"
                valueKey="value"
              />
            </div>
            {hosts.length > 0 ? (
              <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] text-sm">
                {hosts.map((host) => (
                  <li
                    key={host.hostName}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="font-medium text-[var(--foreground)]">{host.hostName}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {host.totalVisits} visits · {host.checkedInVisits} active
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
