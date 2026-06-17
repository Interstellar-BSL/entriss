"use client";



import { useEffect, useMemo, useState } from "react";



import { Drawer } from "@/components/ui/drawer";

import { StatusBadge } from "@/components/ui/badge";

import { listVisits } from "@/lib/api/visits";

import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";

import type { HostRow } from "@/components/hosts/hosts-page";

import { formatHostDepartment } from "@/lib/hosts/host-department-store";

import { VisitStatus } from "@/app/generated/prisma/enums";

import type { VisitWithRelations } from "@/lib/services/internal/visit-include";



function formatWhen(value: Date | string | null | undefined) {

  if (!value) {

    return "—";

  }



  return new Intl.DateTimeFormat("en", {

    month: "short",

    day: "numeric",

    hour: "numeric",

    minute: "2-digit",

  }).format(value instanceof Date ? value : new Date(value));

}



function visitorName(visit: VisitWithRelations) {

  return `${visit.visitor.firstName} ${visit.visitor.lastName}`;

}



function VisitList({

  title,

  visits,

}: {

  title: string;

  visits: VisitWithRelations[];

}) {

  return (

    <section>

      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{title}</h3>

      {visits.length === 0 ? (

        <p className="text-xs text-[var(--muted)]">None</p>

      ) : (

        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">

          {visits.map((visit) => (

            <li key={visit.id} className="flex items-center justify-between px-3 py-2">

              <div>

                <p className="text-sm font-medium text-[var(--foreground)]">{visitorName(visit)}</p>

                <p className="text-xs text-[var(--muted)]">

                  {formatWhen(visit.scheduledAt ?? visit.checkedInAt)}

                </p>

              </div>

              <StatusBadge status={visit.status} />

            </li>

          ))}

        </ul>

      )}

    </section>

  );

}



export function HostDetailDrawer({

  host,

  open,

  onClose,

}: {

  host: HostRow | null;

  open: boolean;

  onClose: () => void;

}) {

  const [visits, setVisits] = useState<VisitWithRelations[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    if (!host?.id || !open) {

      return;

    }



    let cancelled = false;

    setLoading(true);

    setError(null);



    void listVisits({ hostMemberId: host.id, limit: 100 })

      .then((result) => {

        if (!cancelled) {

          setVisits(result.items);

        }

      })

      .catch((err: unknown) => {

        if (!cancelled) {

          setError(toUserFacingErrorMessage(err, "Could not load host visits."));

          setVisits([]);

        }

      })

      .finally(() => {

        if (!cancelled) {

          setLoading(false);

        }

      });



    return () => {

      cancelled = true;

    };

  }, [host?.id, open]);



  const grouped = useMemo(() => {

    const now = Date.now();

    const active = visits.filter((visit) => visit.status === VisitStatus.CHECKED_IN);

    const completed = visits.filter((visit) => visit.status === VisitStatus.CHECKED_OUT);

    const upcoming = visits.filter((visit) => {

      if (visit.status !== VisitStatus.APPROVED && visit.status !== VisitStatus.PENDING) {

        return false;

      }

      if (!visit.scheduledAt) {

        return visit.status === VisitStatus.PENDING;

      }

      return new Date(visit.scheduledAt).getTime() >= now;

    });



    const waitingForHost = [...active, ...upcoming];



    const recentVisitors = [...visits]

      .sort((a, b) => {

        const aTime = new Date(a.checkedInAt ?? a.scheduledAt ?? 0).getTime();

        const bTime = new Date(b.checkedInAt ?? b.scheduledAt ?? 0).getTime();

        return bTime - aTime;

      })

      .reduce<VisitWithRelations[]>((acc, visit) => {

        if (!acc.some((item) => item.visitor.id === visit.visitor.id)) {

          acc.push(visit);

        }

        return acc;

      }, [])

      .slice(0, 10);



    return { active, completed, upcoming, waitingForHost, recentVisitors };

  }, [visits]);



  if (!host) {

    return null;

  }



  const completionRate =

    host.totalVisits > 0

      ? Math.round((grouped.completed.length / host.totalVisits) * 100)

      : 0;



  return (

    <Drawer open={open} onClose={onClose} title={host.name ?? host.email}>

      <div className="space-y-5">

        {!loading && grouped.waitingForHost.length > 0 ? (

          <section className="rounded-md border border-amber-200 bg-amber-50/60 p-4">

            <h3 className="text-sm font-semibold text-amber-950">

              Active visitors ({grouped.waitingForHost.length})

            </h3>

            <ul className="mt-2 space-y-1 text-sm text-amber-950">

              {grouped.waitingForHost.map((visit) => (

                <li key={visit.id}>• {visitorName(visit)}</li>

              ))}

            </ul>

          </section>

        ) : null}



        <section className="rounded-md border border-[var(--border)] p-4">

          <h3 className="text-sm font-semibold text-[var(--foreground)]">Profile</h3>

          <dl className="mt-3 space-y-2 text-sm">

            <div className="flex justify-between gap-4">

              <dt className="text-[var(--muted)]">Name</dt>

              <dd className="font-medium text-[var(--foreground)]">{host.name ?? "—"}</dd>

            </div>

            <div className="flex justify-between gap-4">

              <dt className="text-[var(--muted)]">Email</dt>

              <dd className="font-medium text-[var(--foreground)]">{host.email}</dd>

            </div>

            <div className="flex justify-between gap-4">

              <dt className="text-[var(--muted)]">Department</dt>

              <dd className="font-medium text-[var(--foreground)]">

                {formatHostDepartment(host.department)}

              </dd>

            </div>

            <div className="flex justify-between gap-4">

              <dt className="text-[var(--muted)]">Status</dt>

              <dd>

                <StatusBadge status={host.isActive ? "ACTIVE" : "DISABLED"} />

              </dd>

            </div>

          </dl>

        </section>



        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">

          <div className="rounded-md border border-[var(--border)] px-3 py-2">

            <p className="text-xs text-[var(--muted)]">Total visits</p>

            <p className="text-lg font-semibold">{host.totalVisits}</p>

          </div>

          <div className="rounded-md border border-[var(--border)] px-3 py-2">

            <p className="text-xs text-[var(--muted)]">Active visits</p>

            <p className="text-lg font-semibold">{host.activeVisits}</p>

          </div>

          <div className="rounded-md border border-[var(--border)] px-3 py-2">

            <p className="text-xs text-[var(--muted)]">Upcoming</p>

            <p className="text-lg font-semibold">{grouped.upcoming.length}</p>

          </div>

          <div className="rounded-md border border-[var(--border)] px-3 py-2">

            <p className="text-xs text-[var(--muted)]">Completion rate</p>

            <p className="text-lg font-semibold">{completionRate}%</p>

          </div>

        </section>



        {error ? (

          <p className="text-sm text-red-600">{error}</p>

        ) : null}



        {loading ? (

          <div className="h-20 animate-pulse rounded-md bg-[var(--surface-muted)]" />

        ) : (

          <div className="space-y-4">

            <VisitList title="Checked-in visitors" visits={grouped.active} />

            <VisitList title="Upcoming visits" visits={grouped.upcoming} />

            <VisitList title="Completed visits" visits={grouped.completed.slice(0, 10)} />

            <VisitList title="Recent visitors" visits={grouped.recentVisitors} />

          </div>

        )}

      </div>

    </Drawer>

  );

}


