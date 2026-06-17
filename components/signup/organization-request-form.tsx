"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { submitOrganizationRequest } from "@/lib/api/admin";

export function OrganizationRequestForm() {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [requestedPlan, setRequestedPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await submitOrganizationRequest({
        organizationName: organizationName.trim(),
        organizationEmail: organizationEmail.trim(),
        contactPerson: contactPerson.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        requestedPlan: requestedPlan.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Request submitted</h1>
          <p className="text-sm text-[var(--muted)]">
            Your organization request is pending platform review. You will receive an
            invitation once approved.
          </p>
          <Link href="/login" className="text-sm font-medium text-[var(--foreground)] hover:underline">
            Return to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Request organization access</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Submit your company for review. Platform administrators approve all new tenants.
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <Field label="Organization name" id="organizationName">
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              minLength={2}
            />
          </Field>
          <Field label="Organization email" id="organizationEmail">
            <Input
              id="organizationEmail"
              type="email"
              value={organizationEmail}
              onChange={(e) => setOrganizationEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Contact person" id="contactPerson">
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              required
              minLength={2}
            />
          </Field>
          <Field label="Contact email" id="contactEmail">
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Contact phone (optional)" id="contactPhone">
            <Input
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
          <Field label="Requested plan (optional)" id="requestedPlan">
            <Input
              id="requestedPlan"
              value={requestedPlan}
              onChange={(e) => setRequestedPlan(e.target.value)}
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--foreground)] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {children}
    </div>
  );
}
