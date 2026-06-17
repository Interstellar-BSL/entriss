"use client";

import { useCallback, useEffect, useState } from "react";

import { SettingsToggle } from "@/components/settings/settings-toggle";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { getFeatureFlag, setFeatureFlag } from "@/lib/api/settings";
import {
  DEFAULT_FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
} from "@/lib/settings/feature-flags";

interface FlagState {
  key: FeatureFlagKey;
  label: string;
  description: string;
  value: boolean;
  saving: boolean;
}

function toLabel(key: FeatureFlagKey) {
  return key
    .replace(/^ENABLE_/, "")
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FlagState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        DEFAULT_FEATURE_FLAG_DEFINITIONS.map(async (definition) => {
          const response = await getFeatureFlag(definition.key);
          return {
            key: definition.key,
            label: toLabel(definition.key),
            description: definition.description,
            value: Boolean(response.value),
            saving: false,
          };
        }),
      );
      setFlags(results);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load feature flags",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(key: FeatureFlagKey, nextValue: boolean) {
    setFlags((current) =>
      current.map((flag) =>
        flag.key === key ? { ...flag, value: nextValue, saving: true } : flag,
      ),
    );

    try {
      await setFeatureFlag({ key, value: nextValue });
      setFlags((current) =>
        current.map((flag) =>
          flag.key === key ? { ...flag, saving: false } : flag,
        ),
      );
    } catch (err) {
      setFlags((current) =>
        current.map((flag) =>
          flag.key === key
            ? { ...flag, value: !nextValue, saving: false }
            : flag,
        ),
      );
      setError(
        err instanceof ApiError ? err.message : "Failed to update feature flag",
      );
    }
  }

  if (loading) {
    return <LoadingState variant="panel" />;
  }

  if (error && flags.length === 0) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Organization-level toggles that override default behavior
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {flags.map((flag) => (
            <SettingsToggle
              key={flag.key}
              id={flag.key}
              label={flag.label}
              description={flag.description}
              checked={flag.value}
              disabled={flag.saving}
              onChange={(checked) => void handleToggle(flag.key, checked)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
