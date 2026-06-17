"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPasswordSetupPreview,
  setupPassword,
  type PasswordSetupPreview,
} from "@/lib/api/password-setup";

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<PasswordSetupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setError("Missing setup token");
      setLoading(false);
      return;
    }

    try {
      const data = await getPasswordSetupPreview(token);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup link is invalid");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await setupPassword({ token, password });

      const signInResult = await signIn("credentials", {
        email: result.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Validating setup link…" />;
  }

  if (!preview) {
    return (
      <AuthGlassCard className="space-y-4 text-center">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Setup link unavailable</h1>
        <p className="text-sm text-[var(--muted)]">
          {error ?? "This link may be expired, revoked, or already used."}
        </p>
        <Link href="/login" className="text-sm font-medium text-[var(--foreground)] hover:underline">
          Sign in
        </Link>
      </AuthGlassCard>
    );
  }

  return (
    <AuthGlassCard className="space-y-5">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Set your password
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Activate your admin account for <strong>{preview.organization.name}</strong>
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{preview.email}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Expires {new Date(preview.expiresAt).toLocaleString()}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--foreground)]">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? "Activating account…" : "Activate account"}
          </Button>
        </form>

        {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
    </AuthGlassCard>
  );
}

export function SetupPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Welcome to Entriss"
        subtitle="Complete your account setup"
      />
      <Suspense fallback={<LoadingState label="Loading setup…" />}>
        <SetupPasswordContent />
      </Suspense>
    </div>
  );
}
