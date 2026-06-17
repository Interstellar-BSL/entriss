"use client";

import { useEffect, useState } from "react";
import { Tags } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitorTagBadge } from "@/components/visitors/visitor-tag-badges";
import { ApiError } from "@/lib/api/client";
import {
  getVisitorTags,
  updateVisitorTags,
} from "@/lib/api/visitors";
import {
  VISITOR_TAG_LABELS,
  VISITOR_TAG_VALUES,
  type VisitorTag,
} from "@/lib/visitors/tags";
import { cn } from "@/lib/utils/cn";

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (
      err.code === "PRISMA_CLIENT_OUT_OF_DATE" ||
      err.code === "SCHEMA_OUT_OF_DATE"
    ) {
      return err.message;
    }

    return err.message;
  }

  return fallback;
}

export function VisitorTagsPanel({
  visitorId,
  tags: controlledTags,
  onTagsChange,
}: {
  visitorId: string;
  tags?: VisitorTag[];
  onTagsChange?: (tags: VisitorTag[]) => void;
}) {
  const [tags, setTags] = useState<VisitorTag[]>(controlledTags ?? []);
  const [draftTags, setDraftTags] = useState<VisitorTag[]>(controlledTags ?? []);
  const [loading, setLoading] = useState(controlledTags === undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (controlledTags !== undefined) {
      setTags(controlledTags);
      setDraftTags(controlledTags);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await getVisitorTags(visitorId);
        if (!cancelled) {
          setTags(result.tags);
          setDraftTags(result.tags);
          onTagsChange?.(result.tags);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Failed to load visitor tags."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [controlledTags, onTagsChange, visitorId]);

  function toggleTag(tag: VisitorTag) {
    setDraftTags((current) => {
      const next = current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag];

      setDirty(
        next.length !== tags.length ||
          next.some((value) => !tags.includes(value)),
      );
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const result = await updateVisitorTags(visitorId, draftTags);
      setTags(result.tags);
      setDraftTags(result.tags);
      setDirty(false);
      onTagsChange?.(result.tags);
    } catch (err) {
      setError(formatApiError(err, "Failed to save visitor tags."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading visitor tags…" />;
  }

  if (error && tags.length === 0 && draftTags.length === 0) {
    return <ErrorState title="Could not load tags" message={error} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-[var(--muted)]" aria-hidden />
          <CardTitle>Operational tags</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {VISITOR_TAG_VALUES.map((tag) => {
            const selected = draftTags.includes(tag);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full transition-opacity",
                  selected ? "opacity-100" : "opacity-45 hover:opacity-70",
                )}
                aria-pressed={selected}
              >
                <VisitorTagBadge tag={tag} />
              </button>
            );
          })}
        </div>

        <p className="text-xs text-[var(--muted)]">
          Select all tags that apply. Saving replaces the visitor&apos;s tag set.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
          >
            {saving ? "Saving…" : "Save tags"}
          </Button>
          {dirty ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraftTags(tags);
                setDirty(false);
              }}
              disabled={saving}
            >
              Reset
            </Button>
          ) : null}
        </div>

        {draftTags.length > 0 ? (
          <div className="border-t border-[var(--border)] pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Selected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {draftTags.map((tag) => (
                <span key={tag} className="text-xs text-[var(--muted)]">
                  {VISITOR_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
