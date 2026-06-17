import { analyticsCachePattern } from "./cache-keys";
import { invalidateAnalyticsCache } from "./cache.service";

function invalidateScopes(
  organizationId: string,
  scopes: Array<"dashboard" | "branch" | "host" | "audit">,
) {
  for (const scope of scopes) {
    invalidateAnalyticsCache(analyticsCachePattern(organizationId, scope));
  }
}

export function invalidateAnalyticsOnVisitChange(organizationId: string) {
  invalidateScopes(organizationId, ["dashboard", "branch", "host"]);
}

export function invalidateAnalyticsOnCheckInOut(organizationId: string) {
  invalidateScopes(organizationId, ["dashboard", "branch", "host"]);
}

export function invalidateAnalyticsOnOverride(organizationId: string) {
  invalidateScopes(organizationId, ["dashboard", "audit", "host"]);
}

export function invalidateAnalyticsOnApprovalUpdate(organizationId: string) {
  invalidateScopes(organizationId, ["dashboard"]);
}
