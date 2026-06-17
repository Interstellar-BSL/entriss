import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import { getBranchById, updateBranch } from "@/lib/services/branch.service";
import { updateBranchSchema } from "@/lib/validations/branch";

export const GET = withTenantParams<{ branchId: string }>(
  async (_request, ctx, { branchId }) => {
    const branch = await getBranchById(ctx, branchId);
    return success({ branch });
  },
);

export const PATCH = withTenantParams<{ branchId: string }>(
  async (request, ctx, { branchId }) => {
    const body = await request.json();
    const input = updateBranchSchema.parse(body);
    const branch = await updateBranch(ctx, branchId, input);

    return success({ branch });
  },
);
