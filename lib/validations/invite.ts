import { z } from "zod";

import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";

const invitableRoleSlugs = [
  SYSTEM_ROLE_SLUGS.ADMIN,
  SYSTEM_ROLE_SLUGS.RECEPTIONIST,
  SYSTEM_ROLE_SLUGS.SECURITY,
  SYSTEM_ROLE_SLUGS.VIEWER,
] as const;

export const createInviteSchema = z
  .object({
    email: z.email().transform((value) => value.toLowerCase().trim()),
    roleSlug: z.enum(invitableRoleSlugs).optional(),
    role: z.enum(invitableRoleSlugs).optional(),
  })
  .transform((value) => ({
    email: value.email,
    roleSlug: value.roleSlug ?? value.role ?? SYSTEM_ROLE_SLUGS.VIEWER,
  }));

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
  name: z.string().trim().min(2).max(255).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const listInvitesQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]).optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
