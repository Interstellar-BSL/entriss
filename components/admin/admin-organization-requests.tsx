"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminDataUnavailableBanner } from "@/components/admin/admin-data-unavailable-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import {
  approveAdminOrgRequest,
  listAdminOrgRequests,
  rejectAdminOrgRequest,
  type OrganizationRequestSummary,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export function AdminOrganizationRequests() {
  const [items, setItems] = useState<OrganizationRequestSummary[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [selected, setSelected] = useState<OrganizationRequestSummary | null>(null);
  const [modal, setModal] = useState<"approve" | "reject" | "details" | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approvalResult, setApprovalResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === "ALL" ? undefined : filter;
      const data = await listAdminOrgRequests(status);
      setItems(data.items);
      setDegraded(Boolean(data.degraded));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await approveAdminOrgRequest(selected.id, notes || undefined);
      setApprovalResult(
        `Organization provisioned. Password setup link: ${result.setupPasswordUrl} — setup email queued for ${result.adminEmail}.`,
      );
      setModal(null);
      setNotes("");
      setSelected(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ORG_APPROVAL_FAILED") {
        const step =
          err.details && typeof err.details === "object" && "step" in err.details
            ? String((err.details as { step: string }).step)
            : "unknown";
        setError(`${err.message} (step: ${step})`);
      } else {
        setError(err instanceof Error ? err.message : "Approval failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selected || reason.trim().length < 3) return;
    setSubmitting(true);
    setError(null);
    try {
      await rejectAdminOrgRequest(selected.id, reason.trim());
      setModal(null);
      setReason("");
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setSubmitting(false);
    }
  }

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "PENDING", label: "Pending" },
    { id: "APPROVED", label: "Approved" },
    { id: "REJECTED", label: "Rejected" },
  ];

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading requests…</p>;
  }

  return (
    <div className="space-y-4">
      {degraded ? <AdminDataUnavailableBanner /> : null}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      {approvalResult ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {approvalResult}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filters.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              filter === tab.id
                ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                : "bg-[var(--surface-muted)] text-[var(--muted)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No requests in this view
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                    {item.organizationName}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    <div>{item.contactPerson}</div>
                    <div className="text-xs text-[var(--muted)]">{item.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      title={
                        item.status === "REJECTED" && item.rejectionReason
                          ? item.rejectionReason
                          : undefined
                      }
                    >
                      <StatusBadge status={item.status} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelected(item);
                          setModal("details");
                        }}
                      >
                        View
                      </Button>
                      {item.status === "PENDING" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelected(item);
                              setModal("approve");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelected(item);
                              setModal("reject");
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal === "details"}
        onClose={() => setModal(null)}
        title="Request details"
      >
        {selected ? (
          <dl className="space-y-3 text-sm text-[var(--foreground)]">
            <div>
              <dt className="text-[var(--muted)]">Organization</dt>
              <dd className="font-medium">{selected.organizationName}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Organization email</dt>
              <dd>{selected.organizationEmail}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Contact</dt>
              <dd>
                {selected.contactPerson} — {selected.contactEmail}
              </dd>
            </div>
            {selected.contactPhone ? (
              <div>
                <dt className="text-[var(--muted)]">Phone</dt>
                <dd>{selected.contactPhone}</dd>
              </div>
            ) : null}
            {selected.requestedPlan ? (
              <div>
                <dt className="text-[var(--muted)]">Notes</dt>
                <dd>{selected.requestedPlan}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[var(--muted)]">Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
            </div>
            {selected.rejectionReason ? (
              <div>
                <dt className="text-[var(--muted)]">Rejection reason</dt>
                <dd>{selected.rejectionReason}</dd>
              </div>
            ) : null}
            {selected.approvalNotes ? (
              <div>
                <dt className="text-[var(--muted)]">Approval notes</dt>
                <dd>{selected.approvalNotes}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title="Approve organization request"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Approve <strong>{selected?.organizationName}</strong>. This will create the
            organization, provision an org admin, and send an approval email with an invite
            link.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Notes (optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={submitting}
            onClick={() => void handleApprove()}
          >
            {submitting ? "Approving…" : "Approve and send invite"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={modal === "reject"}
        onClose={() => setModal(null)}
        title="Reject organization request"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Reject <strong>{selected?.organizationName}</strong>. The requester will be
            notified by email when possible.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this request was rejected"
              required
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={submitting || reason.trim().length < 3}
            onClick={() => void handleReject()}
          >
            {submitting ? "Rejecting…" : "Reject request"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
