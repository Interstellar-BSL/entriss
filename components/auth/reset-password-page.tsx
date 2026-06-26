"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  getPasswordResetPreview,
  resetPassword,
  type PasswordResetPreview,
} from "@/lib/api/password";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<PasswordResetPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [completed, setCompleted] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError("Missing reset token");
      setLoading(false);
      return;
    }

    try {
      const data = await getPasswordResetPreview(token);
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "This reset link is invalid or has already been used.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPassword({
        token,
        newPassword,
        confirmPassword,
      });
      setCompleted(true);
      router.push("/login?reset=success");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to reset password. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Validating reset link…" />;
  }

  if (!preview) {
    return (
      <AuthGlassCard className="space-y-4 text-center">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          Reset link unavailable
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {error ??
            "This link may be expired, invalid, or already used. Request a new reset link to continue."}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[var(--foreground)] hover:underline"
          >
            Request a new reset link
          </Link>
          <Link href="/login" className="text-sm text-[var(--muted)] hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthGlassCard>
    );
  }

  if (completed) {
    return <LoadingState label="Redirecting to sign in…" />;
  }

  return (
    <AuthGlassCard className="space-y-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{preview.email}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Expires {new Date(preview.expiresAt).toLocaleString()}
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <PasswordField
          id="newPassword"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          disabled={submitting}
          required
          showStrength
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          disabled={submitting}
          required
        />

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? "Resetting password…" : "Reset password"}
        </Button>
      </form>

      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
    </AuthGlassCard>
  );
}

export function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Reset password"
        subtitle="Choose a new password for your account"
      />
      <Suspense fallback={<LoadingState label="Loading reset form…" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
