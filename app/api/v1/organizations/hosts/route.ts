import { withTenant } from "@/lib/api/with-tenant";
import { success, handleApiError } from "@/lib/api/response";
import {
  listActiveHosts,
  searchHosts,
} from "@/lib/hosts/host-directory";
import { createOrganizationHost } from "@/lib/services/member.service";
import { createOrganizationHostSchema } from "@/lib/validations/member";

export const GET = withTenant(async (request, ctx) => {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const items = query ? await searchHosts(ctx, query) : await listActiveHosts(ctx);
  return success({ items });
});

export const POST = withTenant(async (request, ctx) => {
  try {
    const body = await request.json();
    const input = createOrganizationHostSchema.parse(body);
    const host = await createOrganizationHost(ctx, input);
    return success(host, 201);
  } catch (err) {
    return handleApiError(err);
  }
});
