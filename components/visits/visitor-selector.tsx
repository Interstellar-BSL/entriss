"use client";

import { useEffect, useId, useRef, useState } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { listVisitors, type VisitorRecord } from "@/lib/api/visitors";
import { detachVisitorRecord } from "@/lib/visits/detach";
import { cn } from "@/lib/utils/cn";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_LIMIT = 10;

function formatVisitorSubtitle(visitor: VisitorRecord) {
  const parts = [visitor.email, visitor.phone, visitor.company].filter(Boolean);
  return parts.join(" · ") || "No contact details";
}

export function VisitorSelector({
  selected,
  onSelect,
  disabled,
  error,
}: {
  selected: VisitorRecord | null;
  onSelect: (visitor: VisitorRecord | null) => void;
  disabled?: boolean;
  error?: string;
}) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<VisitorRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open || selected) {
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearching(true);
      setSearchError(null);

      try {
        const response = await listVisitors({
          search: searchQuery || undefined,
          limit: SEARCH_LIMIT,
          offset: 0,
        });

        if (!cancelled) {
          setResults(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            err instanceof ApiError
              ? err.message
              : "Could not search visitors.",
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
  }, [open, searchQuery, selected]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleChangeVisitor() {
    onSelect(null);
    setSearchInput("");
    setSearchQuery("");
    setResults([]);
    setOpen(true);
  }

  if (selected) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {selected.firstName} {selected.lastName}
            </p>
            {selected.email ? (
              <p className="truncate text-sm text-[var(--muted)]">{selected.email}</p>
            ) : null}
            {selected.company ? (
              <p className="truncate text-sm text-[var(--muted)]">{selected.company}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleChangeVisitor}
            disabled={disabled}
          >
            Change visitor
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <FormField
        label="Visitor"
        htmlFor="visitor-search"
        error={error ?? searchError ?? undefined}
      >
        <Input
          id="visitor-search"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder="Search by name, email, or phone…"
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
              {searchQuery ? "No visitors found" : "Type to search visitors"}
            </li>
          ) : (
            results.map((visitor) => (
              <li key={visitor.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    onSelect(detachVisitorRecord(visitor));
                    setOpen(false);
                    setSearchInput("");
                  }}
                >
                  <span className="font-medium text-[var(--foreground)]">
                    {visitor.firstName} {visitor.lastName}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {formatVisitorSubtitle(visitor)}
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
