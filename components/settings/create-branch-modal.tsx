"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createBranch, type BranchSummary } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";

const createBranchFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  code: z.string().trim().max(20).optional(),
  slug: z
    .string()
    .trim()
    .refine(
      (value) =>
        value.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "Use lowercase letters, numbers, and hyphens only",
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
});

type CreateBranchFormValues = z.infer<typeof createBranchFormSchema>;

export function CreateBranchModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (branch: BranchSummary) => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchFormValues>({
    resolver: zodResolver(createBranchFormSchema),
    defaultValues: {
      name: "",
      code: "",
      slug: "",
      description: "",
    },
  });

  async function onSubmit(values: CreateBranchFormValues) {
    setSubmitError(null);

    try {
      const result = await createBranch({
        name: values.name.trim(),
        ...(values.code?.trim()
          ? { code: values.code.trim().toUpperCase() }
          : {}),
        ...(values.slug?.trim() ? { slug: values.slug.trim() } : {}),
        ...(values.description?.trim()
          ? { description: values.description.trim() }
          : {}),
      });

      reset();
      onCreated(result.branch);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Failed to create branch. Please try again.",
      );
    }
  }

  function handleClose() {
    reset();
    setSubmitError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create branch">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Branch name" htmlFor="branchName" error={errors.name?.message}>
          <Input
            id="branchName"
            placeholder="Main reception"
            autoFocus
            {...register("name")}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" htmlFor="branchCode" error={errors.code?.message}>
            <Input
              id="branchCode"
              placeholder="HQ"
              {...register("code")}
            />
          </FormField>
          <FormField label="Slug" htmlFor="branchSlug" error={errors.slug?.message}>
            <Input
              id="branchSlug"
              placeholder="main-reception"
              {...register("slug")}
            />
          </FormField>
        </div>
        <p className="-mt-2 text-xs text-[var(--muted)]">
          Slug is auto-generated from the name if left blank.
        </p>

        <FormField
          label="Description"
          htmlFor="branchDescription"
          error={errors.description?.message}
        >
          <textarea
            id="branchDescription"
            rows={2}
            placeholder="Optional notes about this location"
            className="flex w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            {...register("description")}
          />
        </FormField>

        {submitError ? (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create branch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
