"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  acceptInviteByPath,
  getInviteByToken,
  type InvitePreview,
} from "@/lib/api/invites";

export function InviteAcceptCard({ token }: { token: string }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const loadInvite = useCallback(async () => {
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

  async function handleAccept() {
    setAccepting(true);
    setError(null);

    try {
      const result = await acceptInviteByPath(token);
      await update({});
      if (result.organizationStatus === "APPROVED") {
        router.push("/dashboard");
      } else {
        router.push("/request-access");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--muted)]">
          Loading invitation…
        </CardContent>
      </Card>
    );
  }

  if (!invite) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Invalid invitation</h1>
          <p className="text-sm text-[var(--muted)]">{error ?? "This link may be expired."}</p>
          <Link href="/login" className="text-sm font-medium text-[var(--foreground)] hover:underline">
            Sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  const emailMatches =
    session?.user?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <Card>
      <CardContent className="space-y-5 py-8">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Join {invite.organization.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {invite.invitedBy.name} invited you as <strong>{invite.role.name}</strong>.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">Invitation for {invite.email}</p>
        </div>

        {status === "unauthenticated" ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-[var(--muted)]">Create your account or sign in to accept.</p>
            <Link href={`/accept-invite?token=${encodeURIComponent(token)}`}>
              <Button className="w-full">Continue with invitation</Button>
            </Link>
          </div>
        ) : !emailMatches ? (
          <p className="text-center text-sm text-red-600">
            Sign in as {invite.email} to accept this invitation.
          </p>
        ) : (
          <Button
            className="w-full"
            disabled={accepting}
            onClick={() => void handleAccept()}
          >
            {accepting ? "Joining…" : `Join ${invite.organization.name}`}
          </Button>
        )}

        {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
