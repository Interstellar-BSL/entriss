"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrganization } from "@/lib/api/organizations";

export function CreateOrganizationForm() {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createOrganization({ name: name.trim() });
      await update({});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="org-name" className="text-sm font-medium text-[var(--foreground)]">
          Organization name
        </label>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Corp"
          required
          minLength={2}
          disabled={submitting}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={submitting || name.trim().length < 2}>
        {submitting ? "Submitting…" : "Submit for approval"}
      </Button>
    </form>
  );
}
