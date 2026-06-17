import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { getHostById } from "@/lib/hosts/host-directory";

export const GET = withTenantParams<{ hostMemberId: string }>(
  async (_request, ctx, params) => {
    const host = await getHostById(ctx, params.hostMemberId);
    return success({ host });
  },
);
