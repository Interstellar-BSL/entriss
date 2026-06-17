"use client";

import { useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { searchHosts } from "@/lib/api/hosts";
import { formatHostDepartment } from "@/lib/hosts/host-department-store";
import {
  HOST_SELECTION_MODE_MEMBER,
  HOST_SELECTION_MODE_OTHER,
  type HostSelection,
  type OtherHostDetails,
} from "@/lib/hosts/host-selection";
import type { HostDirectoryEntry } from "@/lib/hosts/types";
import {
  kioskCompactInput,
  kioskCompactSupporting,
} from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

const SEARCH_DEBOUNCE_MS = 300;

function formatHostSubtitle(host: HostDirectoryEntry) {
  const parts = [host.email, formatHostDepartment(host.department)].filter(
    (part) => part && part !== "—",
  );
  return parts.join(" · ");
}

function otherDetailsFromSelection(
  selection: HostSelection | null,
): OtherHostDetails {
  if (selection?.mode === HOST_SELECTION_MODE_OTHER) {
    return selection;
  }

  return {
    mode: HOST_SELECTION_MODE_OTHER,
    requestedHostName: "",
    requestedHostDepartment: "",
    requestedHostEmail: "",
  };
}

export function HostPickerWithOther({
  value,
  onChange,
  disabled,
  error,
  label = "Host",
  placeholder = "Search by name or email…",
  variant = "default",
  lockedMemberId,
  allowDirectorySearch = true,
}: {
  value: HostSelection | null;
  onChange: (selection: HostSelection | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  variant?: "default" | "kiosk";
  /** When set, member picks are limited to this host (schedule visit without user:manage). */
  lockedMemberId?: string | null;
  allowDirectorySearch?: boolean;
}) {
  const { data: session } = useSession();
  const organizationId = session?.user?.organizationId ?? "";
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<HostDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [otherFields, setOtherFields] = useState<OtherHostDetails>(() =>
    otherDetailsFromSelection(value),
  );
  const [otherFieldErrors, setOtherFieldErrors] = useState<{
    requestedHostName?: string;
    requestedHostEmail?: string;
  }>({});

  const inputClassName = variant === "kiosk" ? kioskCompactInput : undefined;
  const isOther = value?.mode === HOST_SELECTION_MODE_OTHER;
  const selectedMember =
    value?.mode === HOST_SELECTION_MODE_MEMBER ? value.host : null;

  useEffect(() => {
    if (value?.mode === HOST_SELECTION_MODE_OTHER) {
      setOtherFields(value);
    }
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open || isOther || selectedMember) {
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearching(true);
      setSearchError(null);

      try {
        const items = await searchHosts(searchQuery, organizationId);
        const filtered = lockedMemberId
          ? items.filter((host) => host.id === lockedMemberId)
          : items;

        if (!cancelled) {
          setResults(filtered);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            err instanceof ApiError ? err.message : "Could not search hosts.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [
    isOther,
    lockedMemberId,
    open,
    organizationId,
    searchQuery,
    selectedMember,
  ]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectMember(host: HostDirectoryEntry) {
    onChange({
      mode: HOST_SELECTION_MODE_MEMBER,
      hostMemberId: host.id,
      host,
    });
    setOtherFieldErrors({});
    setOpen(false);
    setSearchInput("");
  }

  function selectOther() {
    const next = otherDetailsFromSelection(value);
    onChange(next);
    setOtherFields(next);
    setOtherFieldErrors({});
    setOpen(false);
    setSearchInput("");
  }

  function handleChangeHost() {
    onChange(null);
    setOtherFields(otherDetailsFromSelection(null));
    setOtherFieldErrors({});
    setSearchInput("");
    setSearchQuery("");
    setResults([]);
    setOpen(true);
  }

  function commitOtherField(
    field: keyof Pick<
      OtherHostDetails,
      "requestedHostName" | "requestedHostDepartment" | "requestedHostEmail"
    >,
    fieldValue: string,
  ) {
    const next: OtherHostDetails = {
      ...otherFields,
      mode: HOST_SELECTION_MODE_OTHER,
      [field]: fieldValue,
    };
    setOtherFields(next);

    const errors: typeof otherFieldErrors = {};
    if (!next.requestedHostName.trim()) {
      errors.requestedHostName = "Host name is required";
    }
    if (
      next.requestedHostEmail?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.requestedHostEmail.trim())
    ) {
      errors.requestedHostEmail = "Invalid email address";
    }
    setOtherFieldErrors(errors);

    if (!errors.requestedHostName && !errors.requestedHostEmail) {
      onChange({
        mode: HOST_SELECTION_MODE_OTHER,
        requestedHostName: next.requestedHostName.trim(),
        ...(next.requestedHostDepartment?.trim()
          ? { requestedHostDepartment: next.requestedHostDepartment.trim() }
          : {}),
        ...(next.requestedHostEmail?.trim()
          ? { requestedHostEmail: next.requestedHostEmail.trim() }
          : {}),
      });
    } else if (field === "requestedHostName" && !fieldValue.trim()) {
      onChange({
        mode: HOST_SELECTION_MODE_OTHER,
        requestedHostName: "",
      });
    }
  }

  if (selectedMember) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4",
          variant === "kiosk" && "bg-[var(--card)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-[var(--foreground)]">{selectedMember.name}</p>
            <p className="truncate text-sm text-[var(--muted)]">{selectedMember.email}</p>
            {selectedMember.department ? (
              <p className="truncate text-sm text-[var(--muted)]">
                {formatHostDepartment(selectedMember.department)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleChangeHost}
            disabled={disabled}
          >
            Change host
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (isOther) {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4",
            variant === "kiosk" && "bg-[var(--card)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Other host</p>
              <p className={cn("text-sm text-[var(--muted)]", variant === "kiosk" && kioskCompactSupporting)}>
                Visitor is meeting someone not listed yet.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleChangeHost}
              disabled={disabled}
            >
              Change host
            </Button>
          </div>
        </div>

        <FormField
          label="Host name *"
          htmlFor="requested-host-name"
          error={otherFieldErrors.requestedHostName ?? error}
        >
          <Input
            id="requested-host-name"
            className={inputClassName}
            value={otherFields.requestedHostName}
            disabled={disabled}
            onChange={(event) =>
              commitOtherField("requestedHostName", event.target.value)
            }
            placeholder="Who are you visiting?"
          />
        </FormField>

        <FormField label="Department" htmlFor="requested-host-department">
          <Input
            id="requested-host-department"
            className={inputClassName}
            value={otherFields.requestedHostDepartment ?? ""}
            disabled={disabled}
            onChange={(event) =>
              commitOtherField("requestedHostDepartment", event.target.value)
            }
            placeholder="Optional"
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="requested-host-email"
          error={otherFieldErrors.requestedHostEmail}
        >
          <Input
            id="requested-host-email"
            type="email"
            className={inputClassName}
            value={otherFields.requestedHostEmail ?? ""}
            disabled={disabled}
            onChange={(event) =>
              commitOtherField("requestedHostEmail", event.target.value)
            }
            placeholder="Optional"
          />
        </FormField>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <FormField
        label={label}
        htmlFor="host-search"
        error={error ?? searchError ?? undefined}
      >
        <Input
          id="host-search"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className={inputClassName}
          placeholder={placeholder}
          value={searchInput}
          disabled={disabled || !allowDirectorySearch}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </FormField>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg",
            variant === "kiosk" && "static mt-2 max-h-72 shadow-sm",
          )}
        >
          {searching ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">Searching…</li>
          ) : (
            <>
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-[var(--muted)]">
                  {searchQuery ? "No hosts found" : "Type to search hosts"}
                </li>
              ) : (
                results.map((host) => (
                  <li key={host.id} role="option">
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                      onClick={() => selectMember(host)}
                    >
                      <span className="font-medium text-[var(--foreground)]">{host.name}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {formatHostSubtitle(host)}
                      </span>
                    </button>
                  </li>
                ))
              )}
              <li role="separator" className="my-1 border-t border-[var(--border)]" />
              <li role="option">
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  onClick={selectOther}
                >
                  Other
                </button>
              </li>
            </>
          )}
        </ul>
      ) : null}
    </div>
  );
}
