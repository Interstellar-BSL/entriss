"use client";



import { useSession } from "next-auth/react";

import { useCallback, useEffect, useState } from "react";



import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { StatusBadge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { disableMember, updateMember } from "@/lib/api/members";
import { createHost } from "@/lib/api/hosts";
import { listMembers, type OrganizationMemberSummary } from "@/lib/api/invites";

import { getHostAnalytics } from "@/lib/api/analytics";

import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";

import { HostDetailDrawer } from "@/components/hosts/host-detail-drawer";

import {

  formatHostDepartment,

  getHostDepartmentsForOrg,

  setHostDepartment,

} from "@/lib/hosts/host-department-store";



export type HostRow = OrganizationMemberSummary & {

  totalVisits: number;

  activeVisits: number;

  department: string;

};



interface HostFormState {
  mode: "create" | "edit";
  memberId?: string;
  name: string;
  email: string;
  department: string;
}



export function HostsPage() {

  const { data: session } = useSession();

  const organizationId = session?.user?.organizationId ?? "";



  const [hosts, setHosts] = useState<HostRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [form, setForm] = useState<HostFormState | null>(null);

  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);



  const loadHosts = useCallback(async () => {

    if (!organizationId) {

      return;

    }



    setLoading(true);

    setError(null);



    try {

      const [membersResult, analyticsResult] = await Promise.all([

        listMembers(),

        getHostAnalytics({ period: "monthly" }),

      ]);



      const statsByHostId = new Map(

        analyticsResult.hosts.map((host) => [

          host.hostId,

          {

            totalVisits: host.totalVisits,

            activeVisits: host.checkedInVisits,

          },

        ]),

      );

      const departments = getHostDepartmentsForOrg(organizationId);



      setHosts(

        membersResult.items.map((member) => ({

          ...member,

          totalVisits: statsByHostId.get(member.id)?.totalVisits ?? 0,

          activeVisits: statsByHostId.get(member.id)?.activeVisits ?? 0,

          department: departments[member.id] ?? "",

        })),

      );

    } catch (err) {

      setError(toUserFacingErrorMessage(err, "Could not load hosts."));

    } finally {

      setLoading(false);

    }

  }, [organizationId]);



  useEffect(() => {

    void loadHosts();

  }, [loadHosts]);



  useEffect(() => {

    if (!successToast) {

      return;

    }



    const timer = window.setTimeout(() => setSuccessToast(null), 4000);

    return () => window.clearTimeout(timer);

  }, [successToast]);



  const selectedHost = hosts.find((host) => host.id === selectedHostId) ?? null;



  function openCreateForm() {

    setForm({

      mode: "create",

      name: "",

      email: "",

      department: "",

    });

    setFormOpen(true);

  }



  function openEditForm(host: HostRow) {

    setForm({

      mode: "edit",

      memberId: host.id,

      name: host.name ?? "",

      email: host.email,

      department: host.department,

    });

    setFormOpen(true);

  }



  async function handleSubmitForm(event: React.FormEvent) {

    event.preventDefault();

    if (!form || !organizationId) {

      return;

    }



    setSubmitting(true);

    setError(null);



    try {

      if (form.mode === "create") {

        const result = await createHost({

          name: form.name.trim(),

          email: form.email.trim(),

        });

        setHostDepartment(organizationId, result.id, form.department);

        setSuccessToast(

          `Host created. Temporary password: ${result.temporaryPassword}`,

        );

        setFormOpen(false);

        setForm(null);

      } else if (form.memberId) {

        await updateMember(form.memberId, {

          name: form.name.trim(),

        });

        setHostDepartment(organizationId, form.memberId, form.department);

        setSuccessToast("Host updated successfully.");

        setFormOpen(false);

        setForm(null);

      }



      await loadHosts();

    } catch (err) {

      setError(toUserFacingErrorMessage(err, "Could not save host."));

    } finally {

      setSubmitting(false);

    }

  }



  async function handleDeactivate(memberId: string) {

    if (!window.confirm("Deactivate this host? They will lose access but visit history is preserved.")) {

      return;

    }



    setSubmitting(true);

    setError(null);



    try {

      await disableMember(memberId);

      if (selectedHostId === memberId) {

        setSelectedHostId(null);

      }

      await loadHosts();

    } catch (err) {

      setError(toUserFacingErrorMessage(err, "Could not deactivate host."));

    } finally {

      setSubmitting(false);

    }

  }



  return (

    <div className="space-y-5">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">

            Host management

          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">

            View, create, and manage hosts who receive visitors

          </p>

        </div>

        <Button type="button" onClick={openCreateForm} disabled={submitting}>

          + Add host

        </Button>

      </div>



      {error ? (

        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">

          {error}

        </p>

      ) : null}



      {successToast ? (

        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">

          {successToast}

        </p>

      ) : null}



      <Card>

        <CardHeader className="pb-2">

          <CardTitle className="text-base">All hosts</CardTitle>

        </CardHeader>

        <CardContent className="overflow-x-auto pt-0">

          {loading ? (

            <div className="h-32 animate-pulse rounded-md bg-[var(--surface-muted)]" />

          ) : (

            <table className="min-w-full text-left text-sm">

              <thead>

                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">

                  <th className="py-2 pr-4">Name</th>

                  <th className="py-2 pr-4">Email</th>

                  <th className="py-2 pr-4">Department</th>

                  <th className="py-2 pr-4">Status</th>

                  <th className="py-2 pr-4">Total visits</th>

                  <th className="py-2 pr-4">Active visits</th>

                  <th className="py-2">Actions</th>

                </tr>

              </thead>

              <tbody>

                {hosts.map((host) => (

                  <tr key={host.id} className="border-b border-[var(--border)]">

                    <td className="py-3 pr-4 font-medium text-[var(--foreground)]">

                      {host.name ?? "—"}

                    </td>

                    <td className="py-3 pr-4 text-[var(--muted)]">{host.email}</td>

                    <td className="py-3 pr-4 text-[var(--muted)]">

                      {formatHostDepartment(host.department)}

                    </td>

                    <td className="py-3 pr-4">

                      <StatusBadge status={host.isActive ? "ACTIVE" : "DISABLED"} />

                    </td>

                    <td className="py-3 pr-4 tabular-nums">{host.totalVisits}</td>

                    <td className="py-3 pr-4 tabular-nums">{host.activeVisits}</td>

                    <td className="py-3">

                      <div className="flex flex-wrap gap-2">

                        <button

                          type="button"

                          className="text-xs font-medium text-[var(--link)] hover:underline"

                          onClick={() => setSelectedHostId(host.id)}

                        >

                          View

                        </button>

                        <button

                          type="button"

                          className="text-xs font-medium text-[var(--foreground)] hover:underline"

                          onClick={() => openEditForm(host)}

                          disabled={!host.isActive}

                        >

                          Edit

                        </button>

                        <button

                          type="button"

                          className="text-xs font-medium text-red-700 hover:underline"

                          onClick={() => void handleDeactivate(host.id)}

                          disabled={!host.isActive || submitting}

                        >

                          Deactivate

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </CardContent>

      </Card>



      {formOpen && form ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--foreground)]/40 p-4">

          <form

            onSubmit={(event) => void handleSubmitForm(event)}

            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg"

          >

            <h2 className="text-lg font-semibold text-[var(--foreground)]">

              {form.mode === "create" ? "Add host" : "Edit host"}

            </h2>

            <div className="mt-4 space-y-3">

              <div>

                <label className="text-xs font-medium text-[var(--muted)]">Name</label>

                <Input

                  value={form.name}

                  onChange={(event) =>

                    setForm((current) =>

                      current ? { ...current, name: event.target.value } : current,

                    )

                  }

                  required

                />

              </div>

              <div>

                <label className="text-xs font-medium text-[var(--muted)]">Email</label>

                <Input

                  type="email"

                  value={form.email}

                  onChange={(event) =>

                    setForm((current) =>

                      current ? { ...current, email: event.target.value } : current,

                    )

                  }

                  required

                  disabled={form.mode === "edit"}

                />

              </div>

              <div>

                <label className="text-xs font-medium text-[var(--muted)]">Department</label>

                <Input

                  value={form.department}

                  onChange={(event) =>

                    setForm((current) =>

                      current

                        ? { ...current, department: event.target.value }

                        : current,

                    )

                  }

                  placeholder="e.g. Engineering, Sales"

                />

              </div>

            </div>

            <div className="mt-5 flex justify-end gap-2">

              <Button

                type="button"

                variant="secondary"

                onClick={() => {

                  setFormOpen(false);

                  setForm(null);

                }}

              >

                Cancel

              </Button>

              <Button type="submit" loading={submitting} disabled={submitting}>

                {submitting
                  ? form.mode === "create"
                    ? "Creating…"
                    : "Saving…"
                  : form.mode === "create"
                    ? "Create host"
                    : "Save changes"}

              </Button>

            </div>

          </form>

        </div>

      ) : null}



      <HostDetailDrawer

        host={selectedHost}

        open={Boolean(selectedHost)}

        onClose={() => setSelectedHostId(null)}

      />

    </div>

  );

}


