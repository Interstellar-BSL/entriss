import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export default function RequestAccessReceivedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              ✓
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-semibold text-[var(--foreground)]">Request received</h1>
              <p className="text-sm text-[var(--muted)]">
                Your organization access request is being reviewed by our platform team.
              </p>
            </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
