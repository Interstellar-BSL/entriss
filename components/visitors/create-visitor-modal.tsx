"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  createVisitorFormSchema,
  type CreateVisitorFormValues,
} from "@/components/visitors/schemas";
import { VisitorIdentityResolutionCard } from "@/components/visitors/visitor-identity-resolution";
import { FormField } from "@/components/forms/form-field";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/client";
import { createVisitor, type VisitorRecord } from "@/lib/api/visitors";
import {
  checkVisitorIdentityConflict,
  createSeparateVisitor,
  toCreateVisitorInput,
  type PendingVisitorIdentityResolution,
} from "@/lib/visits/visit-engine-client";

export function CreateVisitorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (visitor: VisitorRecord, created: boolean) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingResolution, setPendingResolution] =
    useState<PendingVisitorIdentityResolution | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVisitorFormValues>({
    resolver: zodResolver(createVisitorFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
    },
  });

  const busy = isSubmitting || isResolving;

  function clearResolutionState() {
    setPendingResolution(null);
    setSubmitError(null);
  }

  function handleClose() {
    reset();
    clearResolutionState();
    onClose();
  }

  async function finishCreate(values: CreateVisitorFormValues, forceCreate = false) {
    const result = await createVisitor({
      ...toCreateVisitorInput(values),
      ...(forceCreate ? { forceCreateVisitor: true } : {}),
    });
    reset();
    clearResolutionState();
    onCreated(result.visitor, result.created);
    onClose();
  }

  async function onSubmit(values: CreateVisitorFormValues) {
    setSubmitError(null);
    setIsResolving(true);

    try {
      const conflict = await checkVisitorIdentityConflict(values);
      if (conflict) {
        setPendingResolution(conflict);
        return;
      }

      await finishCreate(values);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to save visitor information. Please try again.",
      );
    } finally {
      setIsResolving(false);
    }
  }

  async function handleUseExisting() {
    if (!pendingResolution) {
      return;
    }

    setSubmitError(null);
    setIsResolving(true);

    try {
      reset();
      clearResolutionState();
      onCreated(pendingResolution.existingVisitor, false);
      onClose();
    } finally {
      setIsResolving(false);
    }
  }

  async function handleCreateSeparate() {
    if (!pendingResolution) {
      return;
    }

    setSubmitError(null);
    setIsResolving(true);

    try {
      const result = await createSeparateVisitor(pendingResolution.input);
      reset();
      clearResolutionState();
      onCreated(result.visitor, result.created);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to save visitor information. Please try again.",
      );
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Visitor information">
      {pendingResolution ? (
        <VisitorIdentityResolutionCard
          existingVisitor={pendingResolution.existingVisitor}
          visitStats={pendingResolution.visitStats}
          onUseExisting={() => void handleUseExisting()}
          onCreateSeparate={() => void handleCreateSeparate()}
          onCancel={clearResolutionState}
          isSubmitting={busy}
        />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="First name"
              htmlFor="firstName"
              error={errors.firstName?.message}
            >
              <Input id="firstName" {...register("firstName")} disabled={busy} />
            </FormField>
            <FormField
              label="Last name"
              htmlFor="lastName"
              error={errors.lastName?.message}
            >
              <Input id="lastName" {...register("lastName")} disabled={busy} />
            </FormField>
          </div>

          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="visitor@company.com"
              {...register("email")}
              disabled={busy}
            />
          </FormField>

          <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 0100"
              {...register("phone")}
              disabled={busy}
            />
          </FormField>

          <FormField label="Company" htmlFor="company" error={errors.company?.message}>
            <Input id="company" {...register("company")} disabled={busy} />
          </FormField>

          {submitError ? (
            <ErrorState title="Could not save visitor information" message={submitError} />
          ) : null}

          <p className="text-xs text-[var(--muted)]">Email or phone is required.</p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
