"use client";

import { useSession } from "next-auth/react";

import { OrgLogo } from "@/components/branding/org-logo";
import { useOrgBranding } from "@/components/providers/org-branding-provider";

export function OrgBadge() {
  const { data: session } = useSession();
  const { branding } = useOrgBranding();
  const role = session?.user?.role;

  if (!session?.user?.organizationId) {
    return null;
  }

  return (
    <div className="min-w-0">
      <OrgLogo branding={branding} size="sm" showName />
      {role ? (
        <p className="mt-0.5 truncate pl-9 text-xs text-[var(--muted)]">{role}</p>
      ) : null}
    </div>
  );
}
