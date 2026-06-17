import { z } from "zod";

import { normalizePhone } from "./visitor";

export const qrTokenSchema = z.object({
  qrToken: z.string().trim().min(10),
});

export const findVisitByVisitorDetailsSchema = z
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
    name: z.string().trim().min(1).max(200).optional(),
    branchId: z.string().min(1).optional(),
    status: z
      .enum(["APPROVED", "CHECKED_IN", "PENDING"])
      .optional(),
  })
  .refine((value) => Boolean(value.email || value.phone || value.name), {
    message: "At least one of email, phone, or name is required",
  });

export type QrTokenInput = z.infer<typeof qrTokenSchema>;
export type FindVisitByVisitorDetailsInput = z.infer<
  typeof findVisitByVisitorDetailsSchema
>;
