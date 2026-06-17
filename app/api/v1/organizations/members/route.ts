import { withTenant } from "@/lib/api/with-tenant";
import { success, handleApiError } from "@/lib/api/response";
import {
  createOrganizationMember,
  listOrganizationMembers,
} from "@/lib/services/member.service";
import { createOrganizationMemberSchema } from "@/lib/validations/member";

export const GET = withTenant(async (_request, ctx) => {
  const items = await listOrganizationMembers(ctx);
  return success({ items });
});

export const POST = withTenant(async (request, ctx) => {
  try {
    const body = await request.json();
    const input = createOrganizationMemberSchema.parse(body);
    const member = await createOrganizationMember(ctx, input);
    return success(member, 201);
  } catch (err) {
    return handleApiError(err);
  }
});
