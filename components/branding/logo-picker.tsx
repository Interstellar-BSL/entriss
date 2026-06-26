"use client";

import { useCallback, useRef, useState } from "react";

import { BrandMark } from "@/components/branding/brand-mark";
import { Button } from "@/components/ui/button";
import { cropImageToSquareDataUrl } from "@/lib/branding/logo-image";
import { cn } from "@/lib/utils/cn";

export function LogoPicker({
  value,
  onChange,
  disabled = false,
  primaryColor,
  organizationName,
}: {
  value: string;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
  primaryColor: string;
  organizationName?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const initial =
    organizationName?.trim().charAt(0).toUpperCase() ?? "E";
  const displayUrl = previewUrl ?? (value.trim() || null);

  const resetFileInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true);

      try {
        const dataUrl = await cropImageToSquareDataUrl(file);
        setPreviewUrl(dataUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not process logo image.",
        );
      } finally {
        setProcessing(false);
        resetFileInput();
      }
    },
    [resetFileInput],
  );

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    await processFile(file);
  }

  function handleApplyPreview() {
    if (!previewUrl) {
      return;
    }

    onChange(previewUrl);
    setPreviewUrl(null);
    resetFileInput();
  }

  function handleDiscardPreview() {
    setPreviewUrl(null);
    resetFileInput();
  }

  function handleRemove() {
    onChange("");
    setPreviewUrl(null);
    setError(null);
    resetFileInput();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <BrandMark
          logoUrl={displayUrl}
          initial={initial}
          primaryColor={primaryColor}
          alt={organizationName ? `${organizationName} logo` : "Organization logo"}
          boxClassName="h-16 w-16 rounded-lg text-lg"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div
            className={cn(
              "rounded-lg border border-dashed px-4 py-5 text-center transition-colors",
              dragActive
                ? "border-[var(--brand-primary)] bg-[var(--surface-muted)]"
                : "border-[var(--border)] bg-[var(--surface-muted)]",
              disabled && "opacity-60",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!disabled) {
                setDragActive(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (!disabled) {
                void handleFiles(event.dataTransfer.files);
              }
            }}
          >
            <p className="text-sm font-medium text-[var(--foreground)]">
              Drop a logo image here
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              PNG, JPEG, or WebP. Automatically cropped to a square.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={disabled || processing}
              loading={processing}
              onClick={() => inputRef.current?.click()}
            >
              Choose image
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={disabled || processing}
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </div>

          {previewUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={handleApplyPreview}
              >
                Use cropped logo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled}
                onClick={handleDiscardPreview}
              >
                Discard preview
              </Button>
            </div>
          ) : null}

          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={handleRemove}
            >
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
