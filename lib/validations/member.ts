import { z } from "zod";

export const createOrganizationMemberSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(2).max(255),
  roleId: z.string().min(1),
});

export const createOrganizationHostSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  name: z.string().trim().min(2).max(255),
});

export const updateOrganizationMemberSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  roleId: z.string().min(1).optional(),
});

export type CreateOrganizationMemberInput = z.infer<
  typeof createOrganizationMemberSchema
>;
export type UpdateOrganizationMemberInput = z.infer<
  typeof updateOrganizationMemberSchema
>;
