import { z } from "zod";

export const approvalActionSchema = z.object({
  notes: z.string().trim().max(5000).optional(),
});

export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;

export const approvalQueueTabSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
