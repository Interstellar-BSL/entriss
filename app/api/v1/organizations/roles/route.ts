import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import { listOrganizationRoles } from "@/lib/services/member.service";

export const GET = withTenant(async (_request, ctx) => {
  const items = await listOrganizationRoles(ctx);
  return success({ items });
});
