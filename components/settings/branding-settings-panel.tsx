"use client";

import { useMemo } from "react";

import { OrgLogo } from "@/components/branding/org-logo";
import { LogoPicker } from "@/components/branding/logo-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  applyOrgBrandingToDocument,
  ORG_THEME_MODES,
  resolveOrgBranding,
  type OrgThemeMode,
} from "@/lib/branding";
import { DEFAULT_ORGANIZATION_SETTINGS } from "@/lib/settings/defaults";
import { cn } from "@/lib/utils/cn";

const THEME_LABELS: Record<OrgThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
  custom: "Custom accent",
};

const selectClassName = cn(
  "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function BrandingSettingsPanel({
  canEdit,
  logoUrl,
  primaryColor,
  secondaryColor,
  welcomeMessage,
  themeMode,
  organizationName,
  onLogoUrlChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onWelcomeMessageChange,
  onThemeModeChange,
  onReset,
  resetting = false,
}: {
  canEdit: boolean;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string;
  themeMode: OrgThemeMode;
  organizationName?: string | null;
  onLogoUrlChange: (value: string) => void;
  onPrimaryColorChange: (value: string) => void;
  onSecondaryColorChange: (value: string) => void;
  onWelcomeMessageChange: (value: string) => void;
  onThemeModeChange: (value: OrgThemeMode) => void;
  onReset?: () => void;
  resetting?: boolean;
}) {
  const preview = useMemo(
    () =>
      resolveOrgBranding(
        {
          logoUrl: logoUrl.trim() || null,
          primaryColor,
          secondaryColor,
          welcomeMessage: welcomeMessage.trim() || null,
          themeMode,
        },
        { organizationName },
      ),
    [
      logoUrl,
      primaryColor,
      secondaryColor,
      welcomeMessage,
      themeMode,
      organizationName,
    ],
  );

  function handlePreview() {
    applyOrgBrandingToDocument(preview);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Logo, colors, and theme for the app shell, kiosk, and visitor-facing
          flows. Changes apply only to your organization.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Live preview
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <OrgLogo branding={preview} size="lg" />
            <Button type="button" size="sm" variant="secondary" onClick={handlePreview}>
              Preview in app
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled>
              Primary action
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled>
              Secondary
            </Button>
          </div>
        </div>

        <FormField label="Organization logo" htmlFor="logoPicker">
          <LogoPicker
            value={logoUrl}
            onChange={onLogoUrlChange}
            disabled={!canEdit}
            primaryColor={primaryColor}
            organizationName={organizationName}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Upload an image or use a hosted URL. Images are center-cropped to a
            square to prevent distortion.
          </p>
        </FormField>

        <details className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
            Advanced: hosted logo URL
          </summary>
          <div className="mt-3">
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl.startsWith("data:") ? "" : logoUrl}
              onChange={(event) => onLogoUrlChange(event.target.value)}
              placeholder="https://…"
              disabled={!canEdit}
            />
          </div>
        </details>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Primary color" htmlFor="primaryColor">
            <div className="flex items-center gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(event) => onPrimaryColorChange(event.target.value)}
                disabled={!canEdit}
                className="h-10 w-12 cursor-pointer rounded border border-[var(--border)] bg-[var(--card)] p-1 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Primary color picker"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(event) => onPrimaryColorChange(event.target.value)}
                placeholder="#2563EB"
                disabled={!canEdit}
              />
            </div>
          </FormField>
          <FormField label="Secondary color" htmlFor="secondaryColor">
            <div className="flex items-center gap-2">
              <input
                id="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(event) => onSecondaryColorChange(event.target.value)}
                disabled={!canEdit}
                className="h-10 w-12 cursor-pointer rounded border border-[var(--border)] bg-[var(--card)] p-1 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Secondary color picker"
              />
              <Input
                type="text"
                value={secondaryColor}
                onChange={(event) => onSecondaryColorChange(event.target.value)}
                placeholder="#1E40AF"
                disabled={!canEdit}
              />
            </div>
          </FormField>
        </div>

        <FormField label="Theme preference" htmlFor="themeMode">
          <select
            id="themeMode"
            className={selectClassName}
            value={themeMode}
            onChange={(event) =>
              onThemeModeChange(event.target.value as OrgThemeMode)
            }
            disabled={!canEdit}
          >
            {ORG_THEME_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {THEME_LABELS[mode]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            System follows the device preference. Custom keeps your accent colors
            on the default light shell.
          </p>
        </FormField>

        <FormField label="Welcome message" htmlFor="welcomeMessage">
          <Input
            id="welcomeMessage"
            value={welcomeMessage}
            onChange={(event) => onWelcomeMessageChange(event.target.value)}
            placeholder="Welcome to our office"
            maxLength={500}
            disabled={!canEdit}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Shown on the kiosk home screen when configured.
          </p>
        </FormField>

        {canEdit && onReset ? (
          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={resetting}
              disabled={resetting}
              onClick={onReset}
            >
              Reset to defaults
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const DEFAULT_BRANDING_FORM = {
  logoUrl: "",
  primaryColor: DEFAULT_ORGANIZATION_SETTINGS.primaryColor,
  secondaryColor: DEFAULT_ORGANIZATION_SETTINGS.secondaryColor,
  welcomeMessage: "",
  themeMode: DEFAULT_ORGANIZATION_SETTINGS.themeMode,
} as const;
