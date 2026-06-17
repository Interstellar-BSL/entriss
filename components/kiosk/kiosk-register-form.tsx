"use client";

import { Building2 } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import { HostPickerWithOther } from "@/components/hosts/host-picker-with-other";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kioskCompactButton,
  kioskCompactInput,
  kioskCompactSupporting,
  kioskCompactTitle,
  kioskPhaseEnter,
} from "@/components/kiosk/kiosk-ui";
import type { BranchOption } from "@/lib/visits/types";
import type { HostSelection } from "@/lib/hosts/host-selection";
import { cn } from "@/lib/utils/cn";

export const PURPOSE_PRESETS = [
  "Meeting",
  "Delivery",
  "Interview",
  "Support visit",
] as const;

export const DEFAULT_REGISTER_PURPOSE = PURPOSE_PRESETS[0];

export const kioskRegisterFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    phone: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    company: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    notes: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    hostMemberId: z.string().min(1, "Host is required"),
    branchId: z.string(),
    purpose: z.string().trim().min(1, "Purpose is required"),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: "custom",
        message: "Email or phone is required",
        path: ["email"],
      });
    }
    if (value.email && !z.email().safeParse(value.email).success) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid email",
        path: ["email"],
      });
    }
  });

export type KioskRegisterFormValues = z.infer<typeof kioskRegisterFormSchema>;

export function KioskRegisterForm({
  register,
  errors,
  branchId,
  purpose,
  branches,
  optionsLoading,
  selectedBranch,
  disabled,
  onBranchSelect,
  onPurposeSelect,
  firstNameRef,
  hostSelection,
  onHostSelectionChange,
  hostError,
}: {
  register: UseFormRegister<KioskRegisterFormValues>;
  errors: FieldErrors<KioskRegisterFormValues>;
  branchId: string;
  purpose: string;
  branches: BranchOption[];
  optionsLoading: boolean;
  selectedBranch: BranchOption | undefined;
  disabled?: boolean;
  onBranchSelect: (id: string) => void;
  onPurposeSelect: (value: string) => void;
  firstNameRef?: React.RefObject<HTMLInputElement | null>;
  hostSelection: HostSelection | null;
  onHostSelectionChange: (selection: HostSelection | null) => void;
  hostError?: string;
}) {
  const firstNameField = register("firstName");

  return (
    <section
      aria-label="Visitor registration details"
      className={cn("space-y-5", kioskPhaseEnter)}
    >
      <div>
        <h2 className={kioskCompactTitle}>Your details</h2>
        <p className={cn("mt-1", kioskCompactSupporting)}>
          Tell us who you are and why you are visiting today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="First name"
          htmlFor="firstName"
          error={errors.firstName?.message}
        >
          <Input
            id="firstName"
            className={kioskCompactInput}
            disabled={disabled}
            autoComplete="given-name"
            {...firstNameField}
            ref={(element) => {
              firstNameField.ref(element);
              if (firstNameRef) {
                firstNameRef.current = element;
              }
            }}
          />
        </FormField>

        <FormField
          label="Last name"
          htmlFor="lastName"
          error={errors.lastName?.message}
        >
          <Input
            id="lastName"
            className={kioskCompactInput}
            disabled={disabled}
            autoComplete="family-name"
            {...register("lastName")}
          />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            className={kioskCompactInput}
            disabled={disabled}
            autoComplete="email"
            placeholder="Recommended"
            {...register("email")}
          />
        </FormField>

        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            className={kioskCompactInput}
            disabled={disabled}
            autoComplete="tel"
            {...register("phone")}
          />
        </FormField>

        <FormField label="Company" htmlFor="company">
          <Input
            id="company"
            className={kioskCompactInput}
            disabled={disabled}
            autoComplete="organization"
            {...register("company")}
          />
        </FormField>

        <FormField label="Notes (optional)" htmlFor="notes">
          <Input
            id="notes"
            className={kioskCompactInput}
            disabled={disabled}
            placeholder="Accessibility, VIP, etc."
            {...register("notes")}
          />
        </FormField>
      </div>

      <div className="space-y-4 border-t border-[var(--border)] pt-4">
        <div>
          <h3 className={kioskCompactTitle}>Visit details</h3>
          <p className={cn("mt-1", kioskCompactSupporting)}>
            Where you are going and why you are visiting.
          </p>
        </div>

        {optionsLoading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--muted)]">
            Loading locations…
          </div>
        ) : branches.length > 1 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">Branch</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {branches.map((branch) => {
                const selected = branch.id === branchId;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onBranchSelect(branch.id)}
                    className={cn(
                      "flex min-h-[2.75rem] items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--on-brand)]"
                        : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border)]",
                    )}
                  >
                    <Building2
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-[var(--on-brand)]" : "text-[var(--muted)]",
                      )}
                    />
                    <span className="font-medium">{branch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : selectedBranch ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm">
            <Building2 className="h-4 w-4 text-[var(--muted)]" />
            <div>
              <p className="text-[var(--muted)]">Branch</p>
              <p className="font-medium text-[var(--foreground)]">{selectedBranch.name}</p>
            </div>
          </div>
        ) : null}

        <HostPickerWithOther
          value={hostSelection}
          onChange={onHostSelectionChange}
          disabled={disabled}
          error={hostError ?? errors.hostMemberId?.message}
          variant="kiosk"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--foreground)]">Purpose</p>
          <div className="flex flex-wrap gap-2">
            {PURPOSE_PRESETS.map((preset) => {
              const selected = purpose === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => onPurposeSelect(preset)}
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                    selected
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--on-brand)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border)]",
                  )}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <Input
            id="purpose"
            className={kioskCompactInput}
            disabled={disabled}
            placeholder="Or type a custom purpose"
            {...register("purpose")}
          />
          {errors.purpose?.message ? (
            <p className="text-sm text-red-600">{errors.purpose.message}</p>
          ) : null}
        </div>

        {selectedBranch?.requiresApproval ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This location requires host approval before check-in.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function KioskRegisterFormActions({
  onBack,
  onContinue,
  backLabel = "Cancel",
  continueLabel = "Continue",
  continueDisabled,
  continueLoading,
}: {
  onBack: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="secondary"
        className={cn("sm:min-w-[8rem]", kioskCompactButton)}
        onClick={onBack}
        disabled={continueLoading}
      >
        {backLabel}
      </Button>
      <Button
        type="button"
        className={cn("sm:min-w-[10rem]", kioskCompactButton)}
        onClick={onContinue}
        disabled={continueDisabled || continueLoading}
      >
        {continueLoading ? "Checking…" : continueLabel}
      </Button>
    </div>
  );
}
