import { withTenant } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "@/lib/services/settings.service";
import { updateOrganizationSettingsSchema } from "@/lib/validations/settings";

export const GET = withTenant(async (_request, ctx) => {
  const result = await getOrganizationSettings(ctx);
  return success(result);
});

export const PATCH = withTenant(async (request, ctx) => {
  const body = await request.json();
  const input = updateOrganizationSettingsSchema.parse(body);
  const result = await updateOrganizationSettings(ctx, input);
  return success(result);
});
