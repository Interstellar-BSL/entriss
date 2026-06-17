"use client";

import { useCallback, useEffect, useState } from "react";

import { SettingsToggle } from "@/components/settings/settings-toggle";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { BadgeTemplateType } from "@/app/generated/prisma/enums";
import { ApiError } from "@/lib/api/client";
import {
  getBranchSettings,
  updateBranchSettings,
  type BranchSettingsResponse,
} from "@/lib/api/settings";
import { loadBranchOptions } from "@/lib/visits/branches";
import type { BranchOption } from "@/lib/visits/types";

const BADGE_TEMPLATES: BadgeTemplateType[] = [
  BadgeTemplateType.standard,
  BadgeTemplateType.minimal,
  BadgeTemplateType.photo,
];

export function BranchSettingsForm() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [data, setData] = useState<BranchSettingsResponse | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [requiresApproval, setRequiresApproval] = useState(false);
  const [autoCheckoutHours, setAutoCheckoutHours] = useState("");
  const [qrExpiryMinutes, setQrExpiryMinutes] = useState("1440");
  const [badgeTemplate, setBadgeTemplate] = useState<BadgeTemplateType>(
    BadgeTemplateType.standard,
  );
  const [allowWalkIns, setAllowWalkIns] = useState(true);

  const applyFormState = useCallback((response: BranchSettingsResponse) => {
    const { settings } = response;
    setRequiresApproval(settings.requiresApproval);
    setAutoCheckoutHours(
      settings.autoCheckoutHours === null
        ? ""
        : String(settings.autoCheckoutHours),
    );
    setQrExpiryMinutes(String(settings.qrExpiryMinutes));
    setBadgeTemplate(settings.badgeTemplate);
    setAllowWalkIns(settings.allowWalkIns);
    setData(response);
  }, []);

  useEffect(() => {
    async function loadBranches() {
      setLoadingBranches(true);
      setError(null);

      try {
        const options = await loadBranchOptions();
        setBranches(options);
        if (options[0]) {
          setBranchId(options[0].id);
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load branches",
        );
      } finally {
        setLoadingBranches(false);
      }
    }

    void loadBranches();
  }, []);

  const loadBranchSettings = useCallback(async () => {
    if (!branchId) {
      return;
    }

    setLoadingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await getBranchSettings(branchId);
      applyFormState(result);
    } catch (err) {
      setData(null);
      setError(
        err instanceof ApiError ? err.message : "Failed to load branch settings",
      );
    } finally {
      setLoadingSettings(false);
    }
  }, [applyFormState, branchId]);

  useEffect(() => {
    if (branchId) {
      void loadBranchSettings();
    }
  }, [branchId, loadBranchSettings]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!branchId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedHours =
        autoCheckoutHours.trim() === ""
          ? null
          : Number.parseInt(autoCheckoutHours, 10);

      const result = await updateBranchSettings(branchId, {
        requiresApproval,
        autoCheckoutHours: parsedHours,
        qrExpiryMinutes: Number.parseInt(qrExpiryMinutes, 10),
        badgeTemplate,
        allowWalkIns,
      });
      applyFormState(result);
      setSuccess("Branch settings saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save branch settings",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingBranches) {
    return <LoadingState label="Loading branches…" />;
  }

  if (branches.length === 0) {
    return (
      <EmptyState
        title="No branches found"
        description="Branches appear here once visits exist for a location. Branch creation UI is coming when the branch API is available."
      />
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Select branch" htmlFor="branchId">
            <select
              id="branchId"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="flex h-9 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </FormField>
        </CardContent>
      </Card>

      {error && !data ? (
        <ErrorState message={error} onRetry={() => void loadBranchSettings()} />
      ) : null}

      {loadingSettings ? (
        <LoadingState label="Loading branch settings…" />
      ) : data ? (
        <>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Branch policy</CardTitle>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Overrides organization defaults for this location
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-[var(--border)]">
                <SettingsToggle
                  id="branchRequiresApproval"
                  label="Require approval"
                  description="New visits at this branch require approval before they can be checked in."
                  checked={requiresApproval}
                  onChange={setRequiresApproval}
                />
                <SettingsToggle
                  id="branchAllowWalkIns"
                  label="Allow walk-ins at this branch"
                  checked={allowWalkIns}
                  onChange={setAllowWalkIns}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="QR expiry (minutes)" htmlFor="qrExpiryMinutes">
                  <Input
                    id="qrExpiryMinutes"
                    type="number"
                    min={15}
                    max={10080}
                    value={qrExpiryMinutes}
                    onChange={(event) => setQrExpiryMinutes(event.target.value)}
                  />
                </FormField>
                <FormField
                  label="Auto check-out (hours)"
                  htmlFor="autoCheckoutHours"
                >
                  <Input
                    id="autoCheckoutHours"
                    type="number"
                    min={1}
                    max={168}
                    value={autoCheckoutHours}
                    onChange={(event) => setAutoCheckoutHours(event.target.value)}
                    placeholder="Optional"
                  />
                </FormField>
              </div>

              <FormField label="Badge template" htmlFor="badgeTemplate">
                <select
                  id="badgeTemplate"
                  value={badgeTemplate}
                  onChange={(event) =>
                    setBadgeTemplate(event.target.value as BadgeTemplateType)
                  }
                  className="flex h-9 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  {BADGE_TEMPLATES.map((template) => (
                    <option key={template} value={template}>
                      {template}
                    </option>
                  ))}
                </select>
              </FormField>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save branch settings"}
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
