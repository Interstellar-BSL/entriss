"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BranchInformationForm } from "@/components/settings/branch-information-form";
import { BranchOperationalSettingsSkeleton } from "@/components/settings/branch-operational-settings-skeleton";
import { SettingsNumberField } from "@/components/settings/settings-number-field";
import {
  SettingsSection,
  SettingsSectionBody,
} from "@/components/settings/settings-section";
import { SettingsTimeRange } from "@/components/settings/settings-time-range";
import { SettingsToggleRow } from "@/components/settings/settings-toggle-row";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { getBranch, type BranchSummary } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";
import {
  getBranchSettings,
  updateBranchSettings,
} from "@/lib/api/settings";
import type { BranchOperationalSettings } from "@/lib/settings/branch-operational";
import {
  buildOperationalPatch,
  operationalSettingsEqual,
} from "@/lib/settings/operational-form";
import { branchOperationalSettingsSchema } from "@/lib/validations/branch-operational-settings";
import { cn } from "@/lib/utils/cn";

type FieldErrors = Partial<Record<keyof BranchOperationalSettings, string>>;

function mapZodErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as keyof BranchOperationalSettings] = issue.message;
    }
  }
  return errors;
}

export function BranchOperationalSettings({
  branchId,
}: {
  branchId: string;
}) {
  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [saved, setSaved] = useState<BranchOperationalSettings | null>(null);
  const [form, setForm] = useState<BranchOperationalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setSaveError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    try {
      const [branchResult, settingsResult] = await Promise.all([
        getBranch(branchId),
        getBranchSettings(branchId),
      ]);

      setBranch(branchResult.branch);
      const operational = settingsResult.config.operational;
      setSaved(operational);
      setForm(operational);
    } catch (err) {
      setSaved(null);
      setForm(null);
      setBranch(null);

      if (err instanceof ApiError && err.code === "BRANCH_NOT_FOUND") {
        setNotFound(true);
        return;
      }

      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Failed to load branch operational policies",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const isDirty = useMemo(() => {
    if (!saved || !form) {
      return false;
    }
    return !operationalSettingsEqual(saved, form);
  }, [saved, form]);

  function updateField<K extends keyof BranchOperationalSettings>(
    key: K,
    value: BranchOperationalSettings[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSaveError(null);
    setSuccessMessage(null);
  }

  async function handleSave() {
    if (!saved || !form || !isDirty) {
      return;
    }

    const validation = branchOperationalSettingsSchema.safeParse(form);
    if (!validation.success) {
      setFieldErrors(mapZodErrors(validation.error.issues));
      return;
    }

    const patch = buildOperationalPatch(saved, form);
    if (!patch) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const response = await updateBranchSettings(branchId, { operational: patch });
      const operational = response.config.operational;
      setSaved(operational);
      setForm(operational);
      setSuccessMessage("Operational policies saved.");
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "Failed to save operational policies",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (saved) {
      setForm(saved);
      setFieldErrors({});
      setSaveError(null);
      setSuccessMessage(null);
    }
  }

  if (loading) {
    return <BranchOperationalSettingsSkeleton />;
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Branch not found"
          message="This branch does not exist, was removed, or is not available in your organization."
        />
        <div className="text-center">
          <Link
            href="/settings/branches"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ← Back to branches
          </Link>
        </div>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <ErrorState
        title="Could not load branch settings"
        message={loadError ?? "Unknown error"}
        onRetry={() => void loadSettings()}
      />
    );
  }

  return (
    <div className={cn("space-y-5", isDirty && "pb-24")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Branch settings
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {branch?.name ?? "Operational policies"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visitor policies and access rules for this location
          </p>
        </div>
        <Link
          href="/settings/branches"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          All branches
        </Link>
      </div>

      {saveError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {saveError}
        </div>
      ) : null}

      {successMessage ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      {branch ? (
        <BranchInformationForm
          branch={branch}
          onUpdated={(updated) => setBranch(updated)}
        />
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Operational policies
        </h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Configure how visitors check in, register, and receive badges at this
          branch
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsSection
          title="Visitor policies"
          description="Control approval, walk-ins, and kiosk availability"
        >
          <SettingsSectionBody>
            <SettingsToggleRow
              id="requireApproval"
              label="Require approval"
              description="New visits must be approved before check-in"
              checked={form.requireApproval}
              onChange={(checked) => updateField("requireApproval", checked)}
            />
            <SettingsToggleRow
              id="allowWalkIns"
              label="Allow walk-ins"
              description="Visitors can register on-site without a pre-booked visit"
              checked={form.allowWalkIns}
              onChange={(checked) => updateField("allowWalkIns", checked)}
            />
            <SettingsToggleRow
              id="kioskEnabled"
              label="Enable kiosk"
              description="Self-service kiosk is available for this branch"
              checked={form.kioskEnabled}
              onChange={(checked) => updateField("kioskEnabled", checked)}
            />
            <SettingsToggleRow
              id="autoCheckInApprovedVisitors"
              label="Auto check-in approved visitors"
              description="Skip manual confirmation when a visit is already approved"
              checked={form.autoCheckInApprovedVisitors}
              onChange={(checked) =>
                updateField("autoCheckInApprovedVisitors", checked)
              }
            />
          </SettingsSectionBody>
        </SettingsSection>

        <SettingsSection
          title="Identity requirements"
          description="Photo and document capture during kiosk registration"
        >
          <SettingsSectionBody>
            <SettingsToggleRow
              id="requireVisitorPhoto"
              label="Require visitor photo"
              description="Affects kiosk registration flow and future compliance workflows"
              checked={form.requireVisitorPhoto}
              onChange={(checked) =>
                updateField("requireVisitorPhoto", checked)
              }
            />
            <SettingsToggleRow
              id="requireVisitorDocuments"
              label="Require visitor documents"
              description="Affects kiosk registration flow and future compliance workflows"
              checked={form.requireVisitorDocuments}
              onChange={(checked) =>
                updateField("requireVisitorDocuments", checked)
              }
            />
          </SettingsSectionBody>
        </SettingsSection>

        <SettingsSection title="Badge & QR">
          <div className="space-y-5">
            <SettingsSectionBody>
              <SettingsToggleRow
                id="badgePrintingEnabled"
                label="Enable badge printing"
                description="Issue printed badges on successful check-in"
                checked={form.badgePrintingEnabled}
                onChange={(checked) =>
                  updateField("badgePrintingEnabled", checked)
                }
              />
            </SettingsSectionBody>
            <SettingsNumberField
              id="qrExpiryHours"
              label="QR expiry"
              description="How long visitor QR codes remain valid after issue"
              value={form.qrExpiryHours}
              min={1}
              max={168}
              suffix="hrs"
              error={fieldErrors.qrExpiryHours}
              onChange={(value) => updateField("qrExpiryHours", value)}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Access hours"
          description="When visitors may check in at this branch"
        >
          <SettingsTimeRange
            startId="allowedVisitStartHour"
            endId="allowedVisitEndHour"
            startLabel="Allowed visit start"
            endLabel="Allowed visit end"
            startValue={form.allowedVisitStartHour}
            endValue={form.allowedVisitEndHour}
            startError={fieldErrors.allowedVisitStartHour}
            endError={fieldErrors.allowedVisitEndHour}
            onStartChange={(value) =>
              updateField("allowedVisitStartHour", value)
            }
            onEndChange={(value) => updateField("allowedVisitEndHour", value)}
          />
        </SettingsSection>
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-10 -mx-1 border-t border-[var(--border)] bg-[var(--surface-muted)]/95 px-1 py-3 backdrop-blur-sm transition-opacity",
          isDirty ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isDirty}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
          <p className="text-sm text-[var(--muted)]">You have unsaved changes</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
