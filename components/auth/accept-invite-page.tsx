"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInvite, getInviteByToken, type InvitePreview } from "@/lib/api/invites";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const loadInvite = useCallback(async () => {
    if (!token) {
      setError("Missing invitation token");
      setLoading(false);
      return;
    }

    try {
      const data = await getInviteByToken(token);
      setInvite(data.invite);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation not found");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function handleAccept(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await acceptInvite({
        token,
        name: name.trim(),
        password,
      });

      const signInResult = await signIn("credentials", {
        email: result.email ?? invite?.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push(result.organizationStatus === "APPROVED" ? "/dashboard" : "/request-access");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Validating invitation…" />;
  }

  if (!invite) {
    return (
      <AuthGlassCard className="space-y-4 text-center">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Invitation unavailable</h1>
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
            Join {invite.organization.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {invite.invitedBy.name} invited you as <strong>{invite.role.name}</strong>
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">For {invite.email}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Expires {new Date(invite.expiresAt).toLocaleString()}
          </p>
        </div>

        <form onSubmit={(event) => void handleAccept(event)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-[var(--foreground)]">
              Full name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              disabled={submitting}
            />
          </div>
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
          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? "Joining organization…" : `Join ${invite.organization.name}`}
          </Button>
        </form>

        {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}

        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
            className="font-medium text-[var(--foreground)] hover:underline"
          >
            Sign in to accept
          </Link>
        </p>
    </AuthGlassCard>
  );
}

export function AcceptInvitePage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Accept invitation"
        subtitle="Join your organization on Entriss"
      />
      <Suspense fallback={<LoadingState label="Loading invitation…" />}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
