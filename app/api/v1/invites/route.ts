import { success, handleApiError } from "@/lib/api/response";
import { withTenant } from "@/lib/api/with-tenant";
import {
  createOrganizationInvite,
  listOrganizationInvites,
} from "@/lib/services/invite.service";
import {
  createInviteSchema,
  listInvitesQuerySchema,
} from "@/lib/validations/invite";

export const GET = withTenant(async (request, ctx) => {
  try {
    const statusParam = new URL(request.url).searchParams.get("status");
    const query = listInvitesQuerySchema.parse({
      status: statusParam ?? undefined,
    });
    const items = await listOrganizationInvites(ctx, query.status);
    return success({ items });
  } catch (err) {
    return handleApiError(err);
  }
});

export const POST = withTenant(async (request, ctx) => {
  try {
    const body = await request.json();
    const input = createInviteSchema.parse(body);
    const invite = await createOrganizationInvite(ctx, input);
    return success({ invite }, 201);
  } catch (err) {
    return handleApiError(err);
  }
});
