"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--muted)]">
          Validating invitation…
        </CardContent>
      </Card>
    );
  }

  if (!invite) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Invitation unavailable</h1>
          <p className="text-sm text-[var(--muted)]">
            {error ?? "This link may be expired, revoked, or already used."}
          </p>
          <Link href="/login" className="text-sm font-medium text-[var(--foreground)] hover:underline">
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-8">
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Joining…" : `Join ${invite.organization.name}`}
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
      </CardContent>
    </Card>
  );
}

export function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
