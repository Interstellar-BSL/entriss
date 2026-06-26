"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { requestPasswordReset } from "@/lib/api/password";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to process your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Forgot your password?"
        subtitle="We'll email you a secure reset link"
      />

      <AuthGlassCard className="space-y-5">
        {submitted ? (
          <div className="space-y-4 text-center">
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Check your email
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {message ??
                "If an account exists for that email address, we sent password reset instructions."}
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-[var(--foreground)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={submitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={submitting}
              disabled={submitting}
            >
              {submitting ? "Sending reset link…" : "Send reset link"}
            </Button>

            <p className="text-center text-sm text-[var(--muted)]">
              Remembered your password?{" "}
              <Link href="/login" className="font-medium text-[var(--foreground)] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </AuthGlassCard>
    </div>
  );
}
