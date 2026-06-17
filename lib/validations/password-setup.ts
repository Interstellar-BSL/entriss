import { z } from "zod";

export const setupPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>;
