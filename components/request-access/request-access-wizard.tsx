"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitOrganizationRequest } from "@/lib/api/admin";
import { cn } from "@/lib/utils/cn";

const INDUSTRIES = [
  "Banking & Finance",
  "Healthcare & Pharma",
  "Manufacturing",
  "Technology",
  "Government",
  "Education",
  "Retail",
  "Other",
] as const;

const COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Other",
] as const;

type Step = 1 | 2 | 3;

interface FormState {
  organizationName: string;
  industry: string;
  country: string;
  fullName: string;
  email: string;
  phone: string;
}

const INITIAL: FormState = {
  organizationName: "",
  industry: "",
  country: "",
  fullName: "",
  email: "",
  phone: "",
};

export function RequestAccessWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canContinue(): boolean {
    if (step === 1) {
      return form.organizationName.trim().length >= 2 && form.country.length > 0;
    }
    if (step === 2) {
      return form.fullName.trim().length >= 2 && form.email.includes("@");
    }
    return true;
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const metadata = [
      form.industry ? `Industry: ${form.industry}` : null,
      form.country ? `Country: ${form.country}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      await submitOrganizationRequest({
        organizationName: form.organizationName.trim(),
        organizationEmail: form.email.trim(),
        contactPerson: form.fullName.trim(),
        contactEmail: form.email.trim(),
        contactPhone: form.phone.trim() || undefined,
        requestedPlan: metadata || undefined,
      });
      router.push("/request-access/received");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
        <StepIndicator current={step} />

        {step === 1 ? (
          <div className="space-y-4">
            <Field label="Organization name" id="organizationName">
              <Input
                id="organizationName"
                value={form.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
                placeholder="e.g. GTBank"
                required
                minLength={2}
              />
            </Field>
            <Field label="Industry (optional)" id="industry">
              <select
                id="industry"
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Country" id="country">
              <select
                id="country"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <Field label="Full name" id="fullName">
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Your name"
                required
                minLength={2}
              />
            </Field>
            <Field label="Work email" id="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@company.com"
                required
              />
            </Field>
            <Field label="Phone (optional)" id="phone">
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+234 …"
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm">
            <h2 className="font-medium text-[var(--foreground)]">Review your request</h2>
            <dl className="space-y-2 text-[var(--foreground)]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Organization</dt>
                <dd className="text-right font-medium">{form.organizationName}</dd>
              </div>
              {form.industry ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Industry</dt>
                  <dd className="text-right">{form.industry}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Country</dt>
                <dd className="text-right">{form.country}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Admin contact</dt>
                <dd className="text-right">{form.fullName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Email</dt>
                <dd className="text-right">{form.email}</dd>
              </div>
              {form.phone ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">Phone</dt>
                  <dd className="text-right">{form.phone}</dd>
                </div>
              ) : null}
            </dl>
            <p className="pt-2 text-xs text-[var(--muted)]">
              Status after submission: <strong>PENDING</strong> — our team will review and
              notify you when approved.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={submitting}
              onClick={() => setStep((prev) => (prev === 2 ? 1 : 2))}
            >
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              className="flex-1"
              disabled={!canContinue()}
              onClick={() => setStep((prev) => (prev === 1 ? 2 : 3))}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              loading={submitting}
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Submitting request…" : "Submit request"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--foreground)] hover:underline">
            Sign in
          </Link>
        </p>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { id: 1, label: "Organization" },
    { id: 2, label: "Admin user" },
    { id: 3, label: "Review" },
  ] as const;

  return (
    <ol className="flex items-center justify-between gap-2">
      {steps.map((step, index) => (
        <li key={step.id} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              current >= step.id
                ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                : "bg-[var(--surface-muted)] text-[var(--muted)]",
            )}
          >
            {step.id}
          </span>
          <span
            className={cn(
              "hidden text-xs font-medium sm:inline",
              current >= step.id ? "text-[var(--foreground)]" : "text-[var(--muted)]",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? (
            <span className="mx-1 hidden h-px flex-1 bg-[var(--surface-muted)] sm:block" />
          ) : null}
        </li>
      ))}
    </ol>
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
