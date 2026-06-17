"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import {
  BrandingSettingsPanel,
  DEFAULT_BRANDING_FORM,
} from "@/components/settings/branding-settings-panel";
import { useOrgBranding } from "@/components/providers/org-branding-provider";
import { SettingsToggle } from "@/components/settings/settings-toggle";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import type { OrgThemeMode } from "@/lib/branding";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  type OrganizationSettingsResponse,
} from "@/lib/api/settings";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";

interface OrgSettingsFormProps {
  canEdit: boolean;
}

export function OrgSettingsForm({ canEdit }: OrgSettingsFormProps) {
  const { data: session } = useSession();
  const { refresh: refreshBranding } = useOrgBranding();
  const [data, setData] = useState<OrganizationSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState<string>(
    DEFAULT_BRANDING_FORM.primaryColor,
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    DEFAULT_BRANDING_FORM.secondaryColor,
  );
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [themeMode, setThemeMode] = useState<OrgThemeMode>(
    DEFAULT_BRANDING_FORM.themeMode,
  );
  const [resetting, setResetting] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [allowWalkIns, setAllowWalkIns] = useState(true);
  const [capturePhoto, setCapturePhoto] = useState(false);
  const [requireIDUpload, setRequireIDUpload] = useState(false);
  const [qrRequired, setQrRequired] = useState(true);
  const [manualOverrideAllowed, setManualOverrideAllowed] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const applyFormState = useCallback((response: OrganizationSettingsResponse) => {
    const { settings } = response;
    setLogoUrl(settings.logoUrl ?? "");
    setPrimaryColor(settings.primaryColor);
    setSecondaryColor(settings.secondaryColor);
    setWelcomeMessage(settings.welcomeMessage ?? "");
    setThemeMode(
      (settings.themeMode as OrgThemeMode) ?? DEFAULT_BRANDING_FORM.themeMode,
    );
    setRequiresApproval(settings.requiresApproval);
    setAllowWalkIns(settings.allowWalkIns);
    setCapturePhoto(settings.capturePhoto);
    setRequireIDUpload(settings.requireIDUpload);
    setQrRequired(settings.qrRequired);
    setManualOverrideAllowed(settings.manualOverrideAllowed);
    setEmailEnabled(settings.emailEnabled);
    setSmsEnabled(settings.smsEnabled);
    setData(response);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getOrganizationSettings();
      applyFormState(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load organization settings",
      );
    } finally {
      setLoading(false);
    }
  }, [applyFormState]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateOrganizationSettings({
        branding: {
          logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
          primaryColor,
          secondaryColor,
          welcomeMessage:
            welcomeMessage.trim() === "" ? null : welcomeMessage.trim(),
          themeMode,
        },
        visitor: {
          requiresApproval,
          allowWalkIns,
          capturePhoto,
          requireIDUpload,
        },
        checkIn: {
          qrRequired,
          manualOverrideAllowed,
        },
        notifications: {
          emailEnabled,
          smsEnabled,
        },
      });
      applyFormState(result);
      await refreshBranding();
      setSuccess("Organization settings saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to save organization settings",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetBranding() {
    if (!canEdit) {
      return;
    }

    setResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateOrganizationSettings({
        branding: {
          logoUrl: null,
          primaryColor: DEFAULT_ORGANIZATION_SETTINGS.primaryColor,
          secondaryColor: DEFAULT_ORGANIZATION_SETTINGS.secondaryColor,
          welcomeMessage: null,
          themeMode: DEFAULT_ORGANIZATION_SETTINGS.themeMode,
        },
      });
      applyFormState(result);
      await refreshBranding();
      setSuccess("Branding reset to defaults.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to reset branding.",
      );
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading organization settings…" />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {!canEdit ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have read-only access. Contact an administrator to change settings.
        </p>
      ) : null}

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

      <BrandingSettingsPanel
        canEdit={canEdit}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        welcomeMessage={welcomeMessage}
        themeMode={themeMode}
        organizationName={session?.user?.organizationName}
        onLogoUrlChange={setLogoUrl}
        onPrimaryColorChange={setPrimaryColor}
        onSecondaryColorChange={setSecondaryColor}
        onWelcomeMessageChange={setWelcomeMessage}
        onThemeModeChange={setThemeMode}
        onReset={() => void handleResetBranding()}
        resetting={resetting}
      />

      <Card>
        <CardHeader>
          <CardTitle>Visitor policy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          <SettingsToggle
            id="requiresApproval"
            label="Require approval"
            description="New visits require approval before they can be checked in."
            checked={requiresApproval}
            disabled={!canEdit}
            onChange={setRequiresApproval}
          />
          <SettingsToggle
            id="allowWalkIns"
            label="Allow walk-in visitors"
            checked={allowWalkIns}
            disabled={!canEdit}
            onChange={setAllowWalkIns}
          />
          <SettingsToggle
            id="capturePhoto"
            label="Capture visitor photo"
            checked={capturePhoto}
            disabled={!canEdit}
            onChange={setCapturePhoto}
          />
          <SettingsToggle
            id="requireIDUpload"
            label="Require ID upload"
            checked={requireIDUpload}
            disabled={!canEdit}
            onChange={setRequireIDUpload}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-in</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          <SettingsToggle
            id="qrRequired"
            label="QR required for check-in"
            checked={qrRequired}
            disabled={!canEdit}
            onChange={setQrRequired}
          />
          <SettingsToggle
            id="manualOverrideAllowed"
            label="Allow manual check-in override"
            description="Staff can check in visitors without scanning a QR code"
            checked={manualOverrideAllowed}
            disabled={!canEdit}
            onChange={setManualOverrideAllowed}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Delivery requires email/SMS provider configuration (not yet active)
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          <SettingsToggle
            id="emailEnabled"
            label="Email notifications"
            checked={emailEnabled}
            disabled={!canEdit}
            onChange={setEmailEnabled}
          />
          <SettingsToggle
            id="smsEnabled"
            label="SMS notifications"
            checked={smsEnabled}
            disabled={!canEdit}
            onChange={setSmsEnabled}
          />
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save organization settings"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
