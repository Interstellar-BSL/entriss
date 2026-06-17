"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import {
  createVisitorFormSchema,
  type CreateVisitorFormValues,
} from "@/components/visitors/schemas";
import { VisitorSelector } from "@/components/visits/visitor-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listBranches, type BranchSummary } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";
import { createVisitor, type VisitorRecord } from "@/lib/api/visitors";
import type { CreateVisitorRequestInput } from "@/lib/validations/visitor";
import { VisitorIdentityResolutionCard } from "@/components/visitors/visitor-identity-resolution";
import {
  checkVisitorIdentityConflict,
  scheduleVisit,
  toCreateVisitorInput,
  type PendingVisitorIdentityResolution,
} from "@/lib/visits/visit-engine-client";
import { HostPickerWithOther } from "@/components/hosts/host-picker-with-other";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import { detachVisitWithRelations } from "@/lib/visits/detach";
import type { HostSelection } from "@/lib/hosts/host-selection";
import {
  getHostSelectionLabel,
  isHostSelectionComplete,
  resolveHostForVisitSubmission,
} from "@/lib/hosts/host-selection";
import type { RegisterVisitResponse } from "@/lib/visits/types";
import { cn } from "@/lib/utils/cn";

type VisitMode = "existing" | "new";

const visitDetailsSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  scheduledAt: z.string().min(1, "Visit date and time is required"),
  purpose: z.string().trim().min(1, "Purpose is required").max(500),
  hostMemberId: z.string().min(1, "Host session is required"),
});

const newVisitorFieldsSchema = createVisitorFormSchema;

const scheduleVisitFormSchema = visitDetailsSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  company: z.string(),
});

type ScheduleVisitFormValues = z.infer<typeof scheduleVisitFormSchema>;

const selectClassName = cn(
  "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] shadow-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function resolveSessionHostMemberId(
  session: ReturnType<typeof useSession>["data"],
) {
  return session?.user?.memberId ?? null;
}

function resolveSessionHostLabel(session: ReturnType<typeof useSession>["data"]) {
  return (
    session?.user?.name?.trim() ||
    session?.user?.email ||
    "Current user"
  );
}

function toRegisterVisitResponse(
  visit: VisitWithRelations,
  visitorCreated: boolean,
): RegisterVisitResponse {
  return {
    visitor: {
      id: visit.visitor.id,
      firstName: visit.visitor.firstName,
      lastName: visit.visitor.lastName,
      email: visit.visitor.email,
      phone: visit.visitor.phone,
      company: visit.visitor.company,
    },
    visit: detachVisitWithRelations(visit),
    visitorCreated,
  };
}

function VisitModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: VisitMode;
  onChange: (mode: VisitMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Visitor type"
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1"
    >
      {(
        [
          { value: "existing" as const, label: "Existing visitor" },
          { value: "new" as const, label: "New visitor" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={mode === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            mode === option.value
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function NewVisitForm({
  onSuccess,
}: {
  onSuccess: (result: RegisterVisitResponse) => void;
}) {
  const { data: session } = useSession();
  const [visitMode, setVisitMode] = useState<VisitMode>("existing");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(
    null,
  );
  const [visitorError, setVisitorError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [hostSelection, setHostSelection] = useState<HostSelection | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] =
    useState<PendingVisitorIdentityResolution | null>(null);
  const [pendingVisitPayload, setPendingVisitPayload] = useState<{
    branchId: string;
    hostMemberId: string;
    purpose: string;
    scheduledAt: string;
    visitorNotes?: string;
  } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const submitLockRef = useRef(false);

  const organizationId = session?.user?.organizationId ?? "";

  const canSelectHost =
    session?.user?.permissions?.includes(PERMISSIONS.USER_MANAGE) ?? false;
  const sessionHostMemberId = resolveSessionHostMemberId(session);
  const sessionHostLabel = resolveSessionHostLabel(session);

  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScheduleVisitFormValues>({
    resolver: zodResolver(scheduleVisitFormSchema),
    defaultValues: {
      branchId: "",
      scheduledAt: "",
      purpose: "",
      hostMemberId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const hostMemberId = watch("hostMemberId");
  const branchId = watch("branchId");
  const purpose = watch("purpose");
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const email = watch("email");
  const phone = watch("phone");

  useEffect(() => {
    if (hostSelection?.mode === "MEMBER") {
      setValue("hostMemberId", hostSelection.hostMemberId, { shouldValidate: true });
      return;
    }

    if (hostSelection?.mode === "OTHER" && sessionHostMemberId) {
      setValue("hostMemberId", sessionHostMemberId, { shouldValidate: true });
      return;
    }

    setValue("hostMemberId", "", { shouldValidate: true });
  }, [hostSelection, sessionHostMemberId, setValue]);

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      setBranchesLoading(true);
      setOptionsError(null);

      try {
        const branchResponse = await listBranches();
        const activeBranches = (branchResponse.items ?? []).filter(
          (branch) => branch.isActive,
        );

        if (cancelled) {
          return;
        }

        setBranches(activeBranches);

        if (activeBranches.length === 1) {
          setValue("branchId", activeBranches[0]!.id, { shouldValidate: true });
        }
      } catch {
        if (!cancelled) {
          setOptionsError("Could not load branches.");
          setBranches([]);
        }
      } finally {
        if (!cancelled) {
          setBranchesLoading(false);
        }
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const visitorReady =
    visitMode === "existing"
      ? Boolean(selectedVisitor)
      : Boolean(firstName?.trim()) &&
        Boolean(lastName?.trim()) &&
        Boolean(email?.trim() || phone?.trim());

  const visitReady =
    isHostSelectionComplete(hostSelection) &&
    Boolean(branchId) &&
    Boolean(purpose?.trim());

  const busy = isSubmitting || isResolving;

  const canSubmit =
    visitorReady &&
    visitReady &&
    Boolean(sessionHostMemberId || hostSelection?.mode === "MEMBER") &&
    !busy &&
    !pendingResolution;

  function handleModeChange(mode: VisitMode) {
    setVisitMode(mode);
    setVisitorError(null);
    setSelectedVisitor(null);
    setPendingResolution(null);
    setPendingVisitPayload(null);
    resetField("firstName");
    resetField("lastName");
    resetField("email");
    resetField("phone");
    resetField("company");
  }

  function clearPendingResolution() {
    setPendingResolution(null);
    setPendingVisitPayload(null);
  }

  async function scheduleVisitForVisitor(
    visitorId: string,
    visitPayload: NonNullable<typeof pendingVisitPayload>,
    visitorCreated: boolean,
  ) {
    const visitResult = await scheduleVisit({
      visitorId,
      ...visitPayload,
    });

    clearPendingResolution();
    onSuccess(toRegisterVisitResponse(visitResult.visit, visitorCreated));
  }

  async function createVisitorAndSchedule(
    values: CreateVisitorFormValues,
    visitPayload: NonNullable<typeof pendingVisitPayload>,
    forceCreate = false,
  ) {
    const visitorPayload: CreateVisitorRequestInput = {
      ...toCreateVisitorInput(values),
      ...(visitPayload.visitorNotes ? { notes: visitPayload.visitorNotes } : {}),
      ...(forceCreate ? { forceCreateVisitor: true } : {}),
    };

    const visitorResult = await createVisitor(visitorPayload);

    await scheduleVisitForVisitor(
      visitorResult.visitor.id,
      visitPayload,
      visitorResult.created,
    );
  }

  async function onSubmit(values: ScheduleVisitFormValues) {
    if (submitLockRef.current || busy) {
      return;
    }

    setSubmitError(null);
    setVisitorError(null);

    if (!isHostSelectionComplete(hostSelection)) {
      setHostError("Select a host for this visit.");
      return;
    }

    const proxyHostMemberId =
      hostSelection.mode === "MEMBER"
        ? hostSelection.hostMemberId
        : sessionHostMemberId;

    if (!proxyHostMemberId) {
      setSubmitError("Your session is missing organization membership.");
      return;
    }

    if (!values.branchId) {
      setSubmitError("Select a branch before scheduling.");
      return;
    }

    let resolvedHost;
    try {
      resolvedHost = resolveHostForVisitSubmission({
        selection: hostSelection,
        proxyHostMemberId,
        purpose: values.purpose,
      });
    } catch {
      setSubmitError("Your session is missing organization membership.");
      return;
    }

    const visitPayload = {
      branchId: values.branchId,
      hostMemberId: resolvedHost.hostMemberId,
      purpose: resolvedHost.purpose ?? values.purpose,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
      visitorNotes: resolvedHost.visitorNotes,
    };

    submitLockRef.current = true;
    setIsResolving(true);

    try {
      if (visitMode === "existing") {
        if (!selectedVisitor) {
          setVisitorError("Select a visitor");
          return;
        }

        const result = await scheduleVisit({
          visitorId: selectedVisitor.id,
          ...visitPayload,
        });

        onSuccess(toRegisterVisitResponse(result.visit, false));
        return;
      }

      const visitorValues = newVisitorFieldsSchema.safeParse({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
      });

      if (!visitorValues.success) {
        const firstIssue = visitorValues.error.issues[0];
        setVisitorError(firstIssue?.message ?? "Visitor details are invalid");
        return;
      }

      const conflict = await checkVisitorIdentityConflict(visitorValues.data);
      if (conflict) {
        setPendingResolution(conflict);
        setPendingVisitPayload(visitPayload);
        return;
      }

      await createVisitorAndSchedule(visitorValues.data, visitPayload);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to schedule visit. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  async function handleUseExistingVisitor() {
    if (!pendingResolution || !pendingVisitPayload || submitLockRef.current) {
      return;
    }

    setSubmitError(null);
    submitLockRef.current = true;
    setIsResolving(true);

    try {
      await scheduleVisitForVisitor(
        pendingResolution.existingVisitor.id,
        pendingVisitPayload,
        false,
      );
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to schedule visit. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  async function handleCreateSeparateVisitor() {
    if (!pendingResolution || !pendingVisitPayload || submitLockRef.current) {
      return;
    }

    setSubmitError(null);
    submitLockRef.current = true;
    setIsResolving(true);

    try {
      await createVisitorAndSchedule(
        pendingResolution.input,
        pendingVisitPayload,
        true,
      );
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to schedule visit. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Schedule visit</CardTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Choose an existing visitor or add someone new, then schedule their
          visit.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <VisitModeToggle
            mode={visitMode}
            onChange={handleModeChange}
            disabled={busy}
          />

          {optionsError ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {optionsError}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}

          {!sessionHostMemberId ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Your account is not linked to an organization member record. Host
              assignment requires an active membership.
            </p>
          ) : null}

          <section className="space-y-4" aria-labelledby="visitor-section-heading">
            <div>
              <h2
                id="visitor-section-heading"
                className="text-sm font-medium text-[var(--foreground)]"
              >
                Visitor
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {visitMode === "existing"
                  ? "Find a returning guest by name, email, or phone."
                  : "Add basic contact details for someone new."}
              </p>
            </div>

            {visitMode === "existing" ? (
              <VisitorSelector
                selected={selectedVisitor}
                onSelect={setSelectedVisitor}
                disabled={busy}
                error={visitorError ?? undefined}
              />
            ) : pendingResolution ? (
              <VisitorIdentityResolutionCard
                existingVisitor={pendingResolution.existingVisitor}
                visitStats={pendingResolution.visitStats}
                onUseExisting={() => void handleUseExistingVisitor()}
                onCreateSeparate={() => void handleCreateSeparateVisitor()}
                onCancel={clearPendingResolution}
                isSubmitting={busy}
              />
            ) : (
              <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="First name"
                    htmlFor="firstName"
                    error={errors.firstName?.message ?? visitorError ?? undefined}
                  >
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      disabled={busy}
                      {...register("firstName")}
                    />
                  </FormField>
                  <FormField
                    label="Last name"
                    htmlFor="lastName"
                    error={errors.lastName?.message}
                  >
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      disabled={busy}
                      {...register("lastName")}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Email"
                    htmlFor="email"
                    error={errors.email?.message}
                  >
                    <Input
                      id="email"
                      type="email"
                      placeholder="visitor@company.com"
                      disabled={busy}
                      {...register("email")}
                    />
                  </FormField>
                  <FormField
                    label="Phone"
                    htmlFor="phone"
                    error={errors.phone?.message}
                  >
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      disabled={busy}
                      {...register("phone")}
                    />
                  </FormField>
                </div>

                <FormField label="Company" htmlFor="company">
                  <Input
                    id="company"
                    placeholder="Company name"
                    disabled={busy}
                    {...register("company")}
                  />
                </FormField>

                <p className="text-xs text-[var(--muted)]">
                  Email or phone is required.
                </p>
              </div>
            )}
          </section>

          <section
            className="space-y-4 border-t border-[var(--border)] pt-6"
            aria-labelledby="visit-details-heading"
          >
            <h2
              id="visit-details-heading"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Visit details
            </h2>

            <FormField
              label="Branch"
              htmlFor="branchId"
              error={errors.branchId?.message}
            >
              <select
                id="branchId"
                className={selectClassName}
                disabled={busy}
                {...register("branchId")}
              >
                <option value="">
                  {branchesLoading
                    ? "Loading branches…"
                    : branches.length === 0
                      ? "No branches available"
                      : "Select branch…"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {branchesLoading ? (
                <p className="mt-1 text-xs text-[var(--muted)]">Loading branches…</p>
              ) : null}
            </FormField>

            <FormField
              label="Visit date & time"
              htmlFor="scheduledAt"
              error={errors.scheduledAt?.message}
            >
              <Input
                id="scheduledAt"
                type="datetime-local"
                disabled={busy}
                {...register("scheduledAt")}
              />
            </FormField>

            <FormField
              label="Purpose"
              htmlFor="purpose"
              error={errors.purpose?.message}
            >
              <Input
                id="purpose"
                placeholder="Meeting, interview, delivery…"
                disabled={busy}
                {...register("purpose")}
              />
            </FormField>

            <HostPickerWithOther
              value={hostSelection}
              onChange={(selection) => {
                setHostSelection(selection);
                setHostError(null);
              }}
              disabled={busy}
              error={hostError ?? errors.hostMemberId?.message}
              lockedMemberId={canSelectHost ? undefined : sessionHostMemberId}
              allowDirectorySearch={canSelectHost}
            />
            <input type="hidden" {...register("hostMemberId")} />
          </section>

          <Button type="submit" loading={busy} disabled={!canSubmit}>
            {busy ? "Scheduling…" : "Schedule visit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
