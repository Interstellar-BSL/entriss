"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvite } from "@/lib/api/invites";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";

const INVITE_ROLES = [
  { slug: SYSTEM_ROLE_SLUGS.ADMIN, label: "Admin" },
  { slug: SYSTEM_ROLE_SLUGS.RECEPTIONIST, label: "Receptionist" },
  { slug: SYSTEM_ROLE_SLUGS.SECURITY, label: "Security" },
  { slug: SYSTEM_ROLE_SLUGS.VIEWER, label: "Viewer" },
] as const;

export function InviteUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState<string>(SYSTEM_ROLE_SLUGS.VIEWER);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await createInvite({ email: email.trim(), roleSlug });
      setSuccess(`Invitation sent to ${result.invite.email}`);
      setEmail("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
        <div className="space-y-2 sm:col-span-1">
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
        <div className="space-y-2">
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
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}
