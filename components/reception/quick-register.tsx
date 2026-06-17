"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import { HostPickerWithOther } from "@/components/hosts/host-picker-with-other";
import { VisitorIdentityResolutionCard } from "@/components/visitors/visitor-identity-resolution";
import { BadgePreviewModal } from "@/components/visits/badge-preview-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { VisitStatus } from "@/app/generated/prisma/enums";
import { loadBranchOptions } from "@/lib/visits/branches";
import type { HostSelection } from "@/lib/hosts/host-selection";
import {
  isHostSelectionComplete,
  resolveHostForVisitSubmission,
} from "@/lib/hosts/host-selection";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import {
  checkInVisit,
  checkVisitorIdentityConflict,
  registerWalkInVisit,
  type PendingVisitorIdentityResolution,
} from "@/lib/visits/visit-engine-client";

const quickRegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    phone: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    company: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: "custom",
        message: "Email or phone is required",
        path: ["email"],
      });
    }

    if (value.email) {
      const emailResult = z.email().safeParse(value.email);
      if (!emailResult.success) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid email address",
          path: ["email"],
        });
      }
    }

    if (value.phone && value.phone.length < 5) {
      ctx.addIssue({
        code: "custom",
        message: "Phone must be at least 5 characters",
        path: ["phone"],
      });
    }
  });

type QuickRegisterValues = z.infer<typeof quickRegisterSchema>;

const DEFAULT_PURPOSE = "Reception check-in";

export function QuickRegister() {
  const { data: session } = useSession();
  const proxyHostMemberId = session?.user?.memberId ?? null;
  const [branchId, setBranchId] = useState<string | null>(null);
  const [hostSelection, setHostSelection] = useState<HostSelection | null>(null);
  const [hostError, setHostError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] =
    useState<PendingVisitorIdentityResolution | null>(null);
  const [pendingValues, setPendingValues] = useState<QuickRegisterValues | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const submitLockRef = useRef(false);

  const [badgeVisit, setBadgeVisit] = useState<VisitWithRelations | null>(null);
  const [badgeInitial, setBadgeInitial] = useState<ThermalBadgeData | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickRegisterValues>({
    resolver: zodResolver(quickRegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const busy = isSubmitting || isResolving;

  useEffect(() => {
    let cancelled = false;

    async function resolveBranch() {
      try {
        const branches = await loadBranchOptions();
        if (!cancelled) {
          if (branches.length > 0) {
            setBranchId(branches[0]!.id);
            setBranchError(null);
          } else {
            setBranchError(
              "No branch available. Create a visit first to configure reception.",
            );
          }
        }
      } catch {
        if (!cancelled) {
          setBranchError("Could not load branch for registration.");
        }
      }
    }

    void resolveBranch();

    return () => {
      cancelled = true;
    };
  }, []);

  async function finishRegistration(
    values: QuickRegisterValues,
    decision:
      | { type: "use-existing"; visitorId: string }
      | { type: "create-separate" }
      | { type: "no-conflict" },
  ) {
    const hostMemberId = proxyHostMemberId;
    if (!hostMemberId || !branchId || !isHostSelectionComplete(hostSelection)) {
      throw new Error("Host or branch is not configured.");
    }

    const resolvedHost = resolveHostForVisitSubmission({
      selection: hostSelection,
      proxyHostMemberId: hostMemberId,
      purpose: DEFAULT_PURPOSE,
    });

    const result = await registerWalkInVisit({
      visitor: {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
        notes: resolvedHost.visitorNotes,
      },
      visit: {
        branchId,
        hostMemberId: resolvedHost.hostMemberId,
        purpose: resolvedHost.purpose ?? DEFAULT_PURPOSE,
      },
      decision,
    });

    let visit = result.visit;
    let badge: ThermalBadgeData | undefined;

    if (visit.status === VisitStatus.APPROVED) {
      const checkIn = await checkInVisit({
        visitId: visit.id,
        source: "reception",
      });
      visit = checkIn.visit;
      badge = checkIn.badge;
    }

    reset();
    setHostSelection(null);
    setHostError(null);
    setPendingResolution(null);
    setPendingValues(null);
    setSuccessMessage(
      visit.status === VisitStatus.CHECKED_IN
        ? `${values.firstName} ${values.lastName} checked in successfully.`
        : `${values.firstName} ${values.lastName} registered${
            visit.status === VisitStatus.PENDING ||
            visit.status === VisitStatus.PENDING
              ? " — awaiting approval"
              : ""
          }.`,
    );

    if (badge) {
      setBadgeVisit(visit);
      setBadgeInitial(badge);
      setBadgeModalOpen(true);
    }
  }

  async function onSubmit(values: QuickRegisterValues) {
    if (submitLockRef.current || busy) {
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);
    setHostError(null);

    if (!isHostSelectionComplete(hostSelection)) {
      setHostError("Select a host for this visit.");
      return;
    }

    if (!proxyHostMemberId) {
      setSubmitError("Your session is missing organization membership.");
      return;
    }

    if (!branchId) {
      setSubmitError(branchError ?? "No branch available for registration.");
      return;
    }

    submitLockRef.current = true;
    setIsResolving(true);

    try {
      const conflict = await checkVisitorIdentityConflict(values);
      if (conflict) {
        setPendingResolution(conflict);
        setPendingValues(values);
        return;
      }

      await finishRegistration(values, { type: "no-conflict" });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  async function handleUseExisting() {
    if (!pendingResolution || !pendingValues || submitLockRef.current) {
      return;
    }

    setSubmitError(null);
    submitLockRef.current = true;
    setIsResolving(true);

    try {
      await finishRegistration(pendingValues, {
        type: "use-existing",
        visitorId: pendingResolution.existingVisitor.id,
      });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  async function handleCreateSeparate() {
    if (!pendingResolution || !pendingValues || submitLockRef.current) {
      return;
    }

    setSubmitError(null);
    submitLockRef.current = true;
    setIsResolving(true);

    try {
      await finishRegistration(pendingValues, { type: "create-separate" });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Registration failed. Please try again.",
      );
    } finally {
      submitLockRef.current = false;
      setIsResolving(false);
    }
  }

  const canSubmit =
    Boolean(branchId && proxyHostMemberId && isHostSelectionComplete(hostSelection)) &&
    !busy;

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Quick register</CardTitle>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Walk-in visitor registration
          </p>
        </CardHeader>
        <CardContent>
          {pendingResolution ? (
            <VisitorIdentityResolutionCard
              existingVisitor={pendingResolution.existingVisitor}
              visitStats={pendingResolution.visitStats}
              onUseExisting={() => void handleUseExisting()}
              onCreateSeparate={() => void handleCreateSeparate()}
              onCancel={() => {
                setPendingResolution(null);
                setPendingValues(null);
              }}
              isSubmitting={busy}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {successMessage ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {successMessage}
                </p>
              ) : null}

              {submitError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </p>
              ) : null}

              {branchError && !branchId ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {branchError}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="First name"
                  htmlFor="firstName"
                  error={errors.firstName?.message}
                >
                  <Input
                    id="firstName"
                    placeholder="First name"
                    autoComplete="given-name"
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
                    placeholder="Last name"
                    autoComplete="family-name"
                    disabled={busy}
                    {...register("lastName")}
                  />
                </FormField>
              </div>

              <FormField
                label="Email"
                htmlFor="email"
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="visitor@company.com"
                  autoComplete="email"
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
                  autoComplete="tel"
                  disabled={busy}
                  {...register("phone")}
                />
              </FormField>

              <FormField label="Company" htmlFor="company">
                <Input
                  id="company"
                  placeholder="Company name"
                  autoComplete="organization"
                  disabled={busy}
                  {...register("company")}
                />
              </FormField>

              <HostPickerWithOther
                value={hostSelection}
                onChange={(selection) => {
                  setHostSelection(selection);
                  setHostError(null);
                }}
                disabled={busy}
                error={hostError ?? undefined}
              />

              <Button type="submit" className="w-full" loading={busy} disabled={!canSubmit}>
                {busy ? "Checking in…" : "Create & Check-in"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <BadgePreviewModal
        visit={badgeVisit}
        open={badgeModalOpen}
        onClose={() => {
          setBadgeModalOpen(false);
          setBadgeInitial(null);
        }}
        initialBadge={badgeInitial}
      />
    </>
  );
}
