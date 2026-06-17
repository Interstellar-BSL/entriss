"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SettingsSection,
  SettingsSectionBody,
} from "@/components/settings/settings-section";
import { SettingsToggleRow } from "@/components/settings/settings-toggle-row";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBranch, type BranchSummary } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";
import { BRANCH_TIMEZONE_OPTIONS } from "@/lib/settings/branch-timezones";

interface BranchMetadataForm {
  name: string;
  code: string;
  description: string;
  timezone: string;
  isActive: boolean;
}

function toFormState(branch: BranchSummary): BranchMetadataForm {
  return {
    name: branch.name,
    code: branch.code ?? "",
    description: branch.description ?? "",
    timezone: branch.timezone,
    isActive: branch.isActive,
  };
}

function metadataEqual(a: BranchMetadataForm, b: BranchMetadataForm): boolean {
  return (
    a.name === b.name &&
    a.code === b.code &&
    a.description === b.description &&
    a.timezone === b.timezone &&
    a.isActive === b.isActive
  );
}

export function BranchInformationForm({
  branch,
  onUpdated,
}: {
  branch: BranchSummary;
  onUpdated: (branch: BranchSummary) => void;
}) {
  const [saved, setSaved] = useState<BranchMetadataForm>(() => toFormState(branch));
  const [form, setForm] = useState<BranchMetadataForm>(() => toFormState(branch));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>(
    {},
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const next = toFormState(branch);
    setSaved(next);
    setForm(next);
    setError(null);
    setFieldErrors({});
  }, [branch]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const isDirty = useMemo(
    () => !metadataEqual(saved, form),
    [saved, form],
  );

  function updateField<K extends keyof BranchMetadataForm>(
    key: K,
    value: BranchMetadataForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
    setSuccessMessage(null);
  }

  async function handleSave() {
    if (!isDirty) {
      return;
    }

    const errors: Partial<Record<string, string>> = {};
    const trimmedName = form.name.trim();

    if (trimmedName.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (trimmedName.length > 100) {
      errors.name = "Name must be at most 100 characters";
    }
    if (form.code.trim().length > 20) {
      errors.code = "Code must be at most 20 characters";
    }
    if (form.description.trim().length > 500) {
      errors.description = "Description must be at most 500 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const patch: Parameters<typeof updateBranch>[1] = {};

      if (trimmedName !== saved.name) {
        patch.name = trimmedName;
      }

      const normalizedCode = form.code.trim().toUpperCase();
      const savedCode = saved.code.trim().toUpperCase();
      if (normalizedCode !== savedCode) {
        patch.code = normalizedCode.length > 0 ? normalizedCode : null;
      }

      if (form.description.trim() !== saved.description.trim()) {
        patch.description = form.description.trim() || null;
      }

      if (form.isActive !== saved.isActive) {
        patch.isActive = form.isActive;
      }

      if (form.timezone !== saved.timezone) {
        patch.timezone = form.timezone;
      }

      const result = await updateBranch(branch.id, patch);
      const next = toFormState(result.branch);
      setSaved(next);
      setForm(next);
      setSuccessMessage("Branch information saved.");
      onUpdated(result.branch);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save branch information",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setForm(saved);
    setFieldErrors({});
    setError(null);
    setSuccessMessage(null);
  }

  return (
    <SettingsSection
      title="Branch information"
      description="Basic details for this location"
    >
      <div className="space-y-4">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Branch name" htmlFor="branchInfoName" error={fieldErrors.name}>
            <Input
              id="branchInfoName"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </FormField>
          <FormField label="Code" htmlFor="branchInfoCode" error={fieldErrors.code}>
            <Input
              id="branchInfoCode"
              value={form.code}
              placeholder="Optional"
              onChange={(event) => updateField("code", event.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Description"
          htmlFor="branchInfoDescription"
          error={fieldErrors.description}
        >
          <textarea
            id="branchInfoDescription"
            rows={2}
            value={form.description}
            placeholder="Optional notes about this location"
            className="flex w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            onChange={(event) => updateField("description", event.target.value)}
          />
        </FormField>

        <FormField
          label="Timezone"
          htmlFor="branchInfoTimezone"
          error={fieldErrors.timezone}
        >
          <select
            id="branchInfoTimezone"
            value={form.timezone}
            className="flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            onChange={(event) => updateField("timezone", event.target.value)}
          >
            {BRANCH_TIMEZONE_OPTIONS.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Visit access hours are evaluated in this timezone.
          </p>
        </FormField>

        <SettingsSectionBody>
          <SettingsToggleRow
            id="branchInfoActive"
            label="Active"
            description="Inactive branches are hidden from new visitor flows"
            checked={form.isActive}
            onChange={(checked) => updateField("isActive", checked)}
          />
        </SettingsSectionBody>

        {isDirty ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
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
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save information"}
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
