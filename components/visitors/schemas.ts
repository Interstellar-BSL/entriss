import { z } from "zod";

export const createVisitorFormSchema = z
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

export type CreateVisitorFormValues = z.infer<typeof createVisitorFormSchema>;
