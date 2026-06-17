import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import {
  getVisitorTags,
  updateVisitorTags,
} from "@/lib/services/visitor-tags.service";
import { visitorTagsBodySchema } from "@/lib/validations/api";

export const GET = withTenantParams<{ id: string }>(
  async (_request, ctx, { id }) => {
    const result = await getVisitorTags(ctx, id);
    return success(result);
  },
);

export const PUT = withTenantParams<{ id: string }>(
  async (request, ctx, { id }) => {
    const body = await request.json();
    const input = visitorTagsBodySchema.parse(body);
    const result = await updateVisitorTags(ctx, id, input.tags);

    return success(result);
  },
);
