import { success } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import { createBranch, listBranches } from "@/lib/services/branch.service";
import { createBranchSchema } from "@/lib/validations/branch";

export const GET = withTenant(async (_request, ctx) => {
  try {
    const branches = await listBranches(ctx);
    return success({ items: branches ?? [] });
  } catch (err) {
    console.error("[api/v1/branches] GET failed:", err);
    throw err;
  }
});

export const POST = withTenant(async (request, ctx) => {
  try {
    const body = await request.json();
    const input = createBranchSchema.parse(body);
    const branch = await createBranch(ctx, input);

    return success({ branch }, 201);
  } catch (err) {
    console.error("[api/v1/branches] POST failed:", err);
    throw err;
  }
});
