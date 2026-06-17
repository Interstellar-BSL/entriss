"use client";

import { useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { searchHosts } from "@/lib/api/hosts";
import type { HostDirectoryEntry } from "@/lib/hosts/types";
import { formatHostDepartment } from "@/lib/hosts/host-department-store";
import { cn } from "@/lib/utils/cn";

const SEARCH_DEBOUNCE_MS = 300;

function formatHostSubtitle(host: HostDirectoryEntry) {
  const parts = [host.email, formatHostDepartment(host.department)]
    .filter((part) => part && part !== "—");
  return parts.join(" · ");
}

export function HostPicker({
  selectedId,
  selectedHost,
  onSelect,
  disabled,
  error,
  label = "Host",
  placeholder = "Search by name or email…",
}: {
  selectedId?: string | null;
  selectedHost?: HostDirectoryEntry | null;
  onSelect: (host: HostDirectoryEntry | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
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
  const [resolvedHost, setResolvedHost] = useState<HostDirectoryEntry | null>(
    selectedHost ?? null,
  );

  const activeSelection =
    selectedHost ?? (selectedId && resolvedHost?.id === selectedId ? resolvedHost : null);

  useEffect(() => {
    if (selectedHost) {
      setResolvedHost(selectedHost);
    }
  }, [selectedHost]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open || activeSelection) {
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearching(true);
      setSearchError(null);

      try {
        const items = await searchHosts(searchQuery, organizationId);
        if (!cancelled) {
          setResults(items);
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
  }, [activeSelection, open, organizationId, searchQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleChangeHost() {
    onSelect(null);
    setResolvedHost(null);
    setSearchInput("");
    setSearchQuery("");
    setResults([]);
    setOpen(true);
  }

  if (activeSelection) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-[var(--foreground)]">{activeSelection.name}</p>
            <p className="truncate text-sm text-[var(--muted)]">{activeSelection.email}</p>
            {activeSelection.department ? (
              <p className="truncate text-sm text-[var(--muted)]">
                {formatHostDepartment(activeSelection.department)}
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
          placeholder={placeholder}
          value={searchInput}
          disabled={disabled}
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
          )}
        >
          {searching ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--muted)]">
              {searchQuery ? "No hosts found" : "Type to search hosts"}
            </li>
          ) : (
            results.map((host) => (
              <li key={host.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    setResolvedHost(host);
                    onSelect(host);
                    setOpen(false);
                    setSearchInput("");
                  }}
                >
                  <span className="font-medium text-[var(--foreground)]">{host.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatHostSubtitle(host)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
