"use client";

import { signOut, useSession } from "next-auth/react";

import { CreateOrganizationForm } from "@/components/onboarding/create-organization-form";
import { Card, CardContent } from "@/components/ui/card";

function PendingApprovalCard() {
  return (
    <Card>
      <CardContent className="space-y-4 py-8 text-center">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          Awaiting platform approval
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Your organization has been submitted and is pending review by the platform
          administrator. You will be able to sign in once it is approved.
        </p>
        <button
          type="button"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </button>
      </CardContent>
    </Card>
  );
}

export function OnboardingFlow() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--muted)]">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const organizationStatus = session?.user?.organizationStatus;

  if (organizationStatus === "PENDING") {
    return <PendingApprovalCard />;
  }

  if (
    organizationStatus === "REJECTED" ||
    organizationStatus === "SUSPENDED"
  ) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Organization access unavailable
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Your organization cannot access Entriss. Contact the platform administrator
            for assistance.
          </p>
          <button
            type="button"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => void signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Create your organization
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Register your company to start managing visitors. Access begins after
            platform approval.
          </p>
        </div>

        <CreateOrganizationForm />

        <button
          type="button"
          className="w-full text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => void signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </button>
      </CardContent>
    </Card>
  );
}
