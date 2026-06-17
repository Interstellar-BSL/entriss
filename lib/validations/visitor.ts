import { z } from "zod";

export const createVisitorSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z
    .email()
    .transform((value) => value.toLowerCase().trim())
    .optional(),
  phone: z
    .string()
    .trim()
    .min(5)
    .max(30)
    .transform(normalizePhone)
    .optional(),
  company: z.string().trim().max(255).optional(),
  photoUrl: z.url().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const findVisitorSchema = z
  .object({
    id: z.string().min(1).optional(),
    email: z
      .email()
      .transform((value) => value.toLowerCase().trim())
      .optional(),
    phone: z
      .string()
      .trim()
      .min(5)
      .max(30)
      .transform(normalizePhone)
      .optional(),
  })
  .refine((value) => Boolean(value.id || value.email || value.phone), {
    message: "At least one of id, email, or phone is required",
  });

export const getOrCreateVisitorSchema = createVisitorSchema.refine(
  (value) => Boolean(value.email || value.phone),
  {
    message: "Email or phone is required to identify a returning visitor",
  },
);

export const resolveVisitorIdentitySchema = z
  .object({
    email: z
      .email()
      .transform((value) => value.toLowerCase().trim())
      .optional(),
    phone: z
      .string()
      .trim()
      .min(5)
      .max(30)
      .transform(normalizePhone)
      .optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Email or phone is required to resolve visitor identity",
  });

export const createVisitorRequestSchema = getOrCreateVisitorSchema.extend({
  forceCreateVisitor: z.boolean().optional(),
});

export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
export type FindVisitorInput = z.infer<typeof findVisitorSchema>;
export type GetOrCreateVisitorInput = z.infer<typeof getOrCreateVisitorSchema>;
export type ResolveVisitorIdentityInput = z.infer<
  typeof resolveVisitorIdentitySchema
>;
export type CreateVisitorRequestInput = z.infer<typeof createVisitorRequestSchema>;

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}
