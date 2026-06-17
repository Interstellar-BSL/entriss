import { z } from "zod";

import { isValidBranchTimezone } from "@/lib/settings/branch-timezones";

export const branchTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidBranchTimezone, {
    message: "Must be a valid IANA timezone",
  });
