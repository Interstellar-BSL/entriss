import { VisitStatus } from "@prisma/client";
import { z } from "zod";

export const createVisitSchema = z.object({
  visitorId: z.string().min(1),
  branchId: z.string().min(1),
  hostMemberId: z.string().min(1),
  purpose: z.string().trim().max(500).optional(),
  scheduledAt: z.coerce.date().optional(),
});

const registerVisitorPayloadSchema = z
  .object({
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
      .optional(),
    company: z.string().trim().max(255).optional(),
    photoUrl: z.url().optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Visitor email or phone is required",
  });

export const registerVisitorVisitSchema = z
  .object({
    visitorId: z.string().min(1).optional(),
    visitor: registerVisitorPayloadSchema.optional(),
    forceCreateVisitor: z.boolean().optional(),
    visit: z.object({
      branchId: z.string().min(1),
      hostMemberId: z.string().min(1),
      purpose: z.string().trim().max(500).optional(),
      scheduledAt: z.coerce.date().optional(),
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.visitorId && !value.visitor) {
      ctx.addIssue({
        code: "custom",
        message: "visitorId or visitor is required",
        path: ["visitor"],
      });
    }

    if (value.visitorId && value.visitor) {
      ctx.addIssue({
        code: "custom",
        message: "Provide visitorId or visitor, not both",
        path: ["visitor"],
      });
    }
  });

export const updateVisitStatusSchema = z
  .object({
    status: z.enum(VisitStatus),
    cancelReason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine(
    (value) =>
      value.status !== VisitStatus.CANCELLED || Boolean(value.cancelReason),
    {
      message: "cancelReason is required when cancelling a visit",
      path: ["cancelReason"],
    },
  );

export const checkInVisitSchema = z.object({
  visitId: z.string().min(1),
});

export const checkOutVisitSchema = z.object({
  visitId: z.string().min(1),
});

export const forceVisitOverrideSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  note: z.string().trim().max(2000).optional(),
});

export type ForceVisitOverrideInput = z.infer<typeof forceVisitOverrideSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type RegisterVisitorVisitInput = z.infer<typeof registerVisitorVisitSchema>;
export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>;
