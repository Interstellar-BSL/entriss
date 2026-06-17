import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  getBranchSettings,
  updateBranchSettings,
} from "@/lib/services/settings.service";
import { updateBranchSettingsSchema } from "@/lib/validations/settings";

export const GET = withTenantParams<{ branchId: string }>(
  async (_request, ctx, { branchId }) => {
    const result = await getBranchSettings(ctx, branchId);
    return success(result);
  },
);

export const PATCH = withTenantParams<{ branchId: string }>(
  async (request, ctx, { branchId }) => {
    const body = await request.json();
    const input = updateBranchSettingsSchema.parse(body);
    const result = await updateBranchSettings(ctx, branchId, input);
    return success(result);
  },
);
