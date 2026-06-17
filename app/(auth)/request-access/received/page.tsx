import Link from "next/link";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { StatusBadge } from "@/components/ui/badge";

export default function RequestAccessReceivedPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Request received"
        subtitle="We will notify you when your organization is approved"
      />
      <AuthGlassCard className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          ✓
        </div>
        <p className="text-sm text-[var(--muted)]">
          Your organization access request is being reviewed by our platform team.
        </p>
        <div className="flex justify-center">
          <StatusBadge status="PENDING" />
        </div>
        <p className="text-sm text-[var(--muted)]">
          Once approved, you will receive an invitation email with login instructions for
          your organization admin account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-[var(--foreground)] hover:underline"
        >
          Return to sign in
        </Link>
      </AuthGlassCard>
    </div>
  );
}
