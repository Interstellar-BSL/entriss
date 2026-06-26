"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { AccountSecurityPanel } from "@/components/settings/account-security-panel";
import { BranchSettingsIndex } from "@/components/settings/branch-settings-index";
import { FeatureFlagsPanel } from "@/components/settings/feature-flags-panel";
import { OrgSettingsForm } from "@/components/settings/org-settings-form";
import { TeamPanel } from "@/components/settings/team-panel";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils/cn";

type SettingsTab = "account" | "organization" | "team" | "branches" | "features";

export function SettingsPage() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];

  const canEditOrg = permissions.includes(PERMISSIONS.USER_MANAGE);
  const canManageTeam = permissions.includes(PERMISSIONS.USER_MANAGE);
  const canManageBranches = permissions.includes(PERMISSIONS.BRANCH_MANAGE);
  const canManageFlags = permissions.includes(PERMISSIONS.USER_MANAGE);

  const tabs: Array<{ id: SettingsTab; label: string; visible: boolean }> = [
    { id: "account", label: "Account", visible: true },
    { id: "organization", label: "Organization", visible: true },
    { id: "team", label: "Team", visible: canManageTeam },
    { id: "branches", label: "Branches", visible: canManageBranches },
    { id: "features", label: "Feature flags", visible: canManageFlags },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    visibleTabs[0]?.id ?? "organization",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Configure organization policies, branch overrides, and feature flags
        </p>
        {canManageTeam ? (
          <p className="mt-2 text-sm">
            <Link
              href="/settings/invites"
              className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
            >
              Manage team invitations
            </Link>
            {" · "}
            <Link
              href="/settings/users"
              className="font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
            >
              Manage organization users
            </Link>
          </p>
        ) : null}
      </div>

      {visibleTabs.length > 1 ? (
        <nav
          className="flex gap-1 border-b border-[var(--border)]"
          aria-label="Settings sections"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-[var(--foreground)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}

      {activeTab === "account" ? <AccountSecurityPanel /> : null}

      {activeTab === "organization" ? (
        <OrgSettingsForm canEdit={canEditOrg} />
      ) : null}

      {activeTab === "team" && canManageTeam ? <TeamPanel /> : null}

      {activeTab === "branches" && canManageBranches ? (
        <BranchSettingsIndex />
      ) : null}

      {activeTab === "features" && canManageFlags ? (
        <FeatureFlagsPanel />
      ) : null}
    </div>
  );
}
