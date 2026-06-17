"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CreateBranchModal } from "@/components/settings/create-branch-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listBranches, type BranchSummary } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BranchSettingsIndex() {
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdBranch, setCreatedBranch] = useState<BranchSummary | null>(null);

  async function loadBranches() {
    setLoading(true);
    setError(null);
    setErrorTitle(null);

    try {
      const result = await listBranches();
      setBranches(result.items ?? []);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorTitle(
          err.code === "FORBIDDEN"
            ? "Permission required"
            : err.code === "INTERNAL_ERROR"
              ? "Branch service unavailable"
              : "Could not load branches",
        );
        setError(err.message);
      } else {
        setErrorTitle("Could not load branches");
        setError("Failed to load branches. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
      setCreatedBranch(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  function handleCreated(branch: BranchSummary) {
    setBranches((current) =>
      [...current, branch].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setCreatedBranch(branch);
    setSuccessMessage(`"${branch.name}" was created.`);
  }

  if (loading) {
    return <LoadingState label="Loading branches…" />;
  }

  if (error) {
    return (
      <ErrorState
        title={errorTitle ?? "Could not load branches"}
        message={error}
        onRetry={() => void loadBranches()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {branches.length} branch{branches.length === 1 ? "" : "es"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create branch
        </Button>
      </div>

      {successMessage ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          <span>{successMessage}</span>
          {createdBranch ? (
            <>
              {" "}
              <Link
                href={`/settings/branches/${createdBranch.id}`}
                className="font-medium underline underline-offset-2"
              >
                Configure policies →
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {branches.length === 0 ? (
        <EmptyState
          title="No branches created"
          description="Create your first branch to configure visitor policies, kiosk behavior, and operational rules."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create branch
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Branches</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Manage location details and operational visitor policies
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-[var(--border)] p-0">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--foreground)]">
                      {branch.name}
                    </span>
                    {branch.code ? (
                      <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                        {branch.code}
                      </span>
                    ) : null}
                    <span
                      className={
                        branch.isActive
                          ? "text-xs text-emerald-700"
                          : "text-xs text-[var(--muted)]"
                      }
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Updated {formatUpdatedAt(branch.updatedAt)}
                  </p>
                </div>
                <Link
                  href={`/settings/branches/${branch.id}`}
                  className="shrink-0 text-sm font-medium text-[var(--foreground)] hover:text-[var(--foreground)]"
                >
                  Manage policies →
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CreateBranchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
