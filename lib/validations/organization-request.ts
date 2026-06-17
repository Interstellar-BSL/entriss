import { z } from "zod";

export const createOrganizationRequestSchema = z.object({
  organizationName: z.string().trim().min(2).max(255),
  organizationEmail: z.email().transform((value) => value.toLowerCase().trim()),
  contactPerson: z.string().trim().min(2).max(255),
  contactEmail: z.email().transform((value) => value.toLowerCase().trim()),
  contactPhone: z.string().trim().max(50).optional(),
  requestedPlan: z.string().trim().max(100).optional(),
});

export const rejectOrganizationRequestSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export const approveOrganizationRequestSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

export type CreateOrganizationRequestInput = z.infer<
  typeof createOrganizationRequestSchema
>;
