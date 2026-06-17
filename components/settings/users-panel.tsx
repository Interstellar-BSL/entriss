"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { listMembers } from "@/lib/api/invites";
import {
  createMember,
  disableMember,
  listOrganizationRoles,
  updateMember,
  type OrganizationMemberSummary,
  type OrganizationRoleSummary,
} from "@/lib/api/members";

interface EditState {
  memberId: string;
  name: string;
  roleId: string;
}

export function UsersPanel() {
  const [members, setMembers] = useState<OrganizationMemberSummary[]>([]);
  const [roles, setRoles] = useState<OrganizationRoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ email: "", name: "", roleId: "" });
  const [edit, setEdit] = useState<EditState | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersResult, rolesResult] = await Promise.all([
        listMembers(),
        listOrganizationRoles(),
      ]);
      setMembers(membersResult.items);
      setRoles(rolesResult.items);
      setAddForm((prev) => ({
        ...prev,
        roleId: prev.roleId || rolesResult.items[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatedPassword(null);
    setSubmitting(true);

    try {
      const result = await createMember({
        email: addForm.email.trim(),
        name: addForm.name.trim(),
        roleId: addForm.roleId,
      });
      setCreatedPassword(result.temporaryPassword);
      setAddForm({ email: "", name: "", roleId: roles[0]?.id ?? "" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!edit) {
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await updateMember(edit.memberId, {
        name: edit.name.trim(),
        roleId: edit.roleId,
      });
      setEdit(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(memberId: string) {
    if (!window.confirm("Disable this user? They will lose access immediately.")) {
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await disableMember(memberId);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable user");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading users…</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Add user</h2>
          <p className="text-sm text-[var(--muted)]">
            Create a user account within this organization only.
          </p>
        </div>

        <form
          onSubmit={(event) => void handleCreate(event)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <div className="space-y-2">
            <label htmlFor="user-name" className="text-sm font-medium text-[var(--foreground)]">
              Name
            </label>
            <Input
              id="user-name"
              value={addForm.name}
              onChange={(event) =>
                setAddForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Jane Doe"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user-email" className="text-sm font-medium text-[var(--foreground)]">
              Email
            </label>
            <Input
              id="user-email"
              type="email"
              value={addForm.email}
              onChange={(event) =>
                setAddForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="jane@company.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="user-role" className="text-sm font-medium text-[var(--foreground)]">
              Role
            </label>
            <select
              id="user-role"
              value={addForm.roleId}
              onChange={(event) =>
                setAddForm((prev) => ({ ...prev, roleId: event.target.value }))
              }
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              required
              disabled={submitting}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={submitting || !addForm.roleId}>
            {submitting ? "Creating…" : "Add user"}
          </Button>
        </form>

        {createdPassword ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            User created. Temporary password:{" "}
            <span className="font-mono font-medium">{createdPassword}</span>
          </p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Users ({members.length})
        </h3>
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {members.map((member) => {
                const isEditing = edit?.memberId === member.id;
                const isDisabled = !member.isActive || member.status === "DISABLED";

                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {isEditing ? (
                        <Input
                          value={edit.name}
                          onChange={(event) =>
                            setEdit((prev) =>
                              prev ? { ...prev, name: event.target.value } : prev,
                            )
                          }
                          disabled={submitting}
                        />
                      ) : (
                        member.name ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{member.email}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {isEditing ? (
                        <select
                          value={edit.roleId}
                          onChange={(event) =>
                            setEdit((prev) =>
                              prev ? { ...prev, roleId: event.target.value } : prev,
                            )
                          }
                          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-sm"
                          disabled={submitting}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        member.role.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={isDisabled ? "DISABLED" : member.status}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={submitting}
                              onClick={() => void handleSaveEdit()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={submitting}
                              onClick={() => setEdit(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={submitting || isDisabled}
                              onClick={() =>
                                setEdit({
                                  memberId: member.id,
                                  name: member.name ?? "",
                                  roleId: member.role.id,
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={submitting || isDisabled}
                              onClick={() => void handleDisable(member.id)}
                            >
                              Disable
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
