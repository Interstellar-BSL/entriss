import { FEATURE_FLAGS } from "@/lib/settings/feature-flags";
import { withTenantParams } from "@/lib/api/with-tenant";
import { success } from "@/lib/api/response";
import {
  getFeatureFlag,
  setFeatureFlag,
} from "@/lib/services/settings.service";
import { setFeatureFlagSchema } from "@/lib/validations/settings";
import type { FeatureFlagKey } from "@/lib/settings/feature-flags";

const FLAG_KEYS = new Set<string>(Object.values(FEATURE_FLAGS));

export const GET = withTenantParams<{ key: string }>(
  async (_request, ctx, { key }) => {
    if (!FLAG_KEYS.has(key)) {
      throw new Error(`Unknown feature flag: ${key}`);
    }

    const result = await getFeatureFlag(ctx, key as FeatureFlagKey);
    return success(result);
  },
);

export const PUT = withTenantParams<{ key: string }>(
  async (request, ctx, { key }) => {
    const body = await request.json();
    const input = setFeatureFlagSchema.parse({ ...body, key });
    const flag = await setFeatureFlag(
      ctx,
      input.key,
      input.value,
      input.description,
    );
    return success({ flag });
  },
);
