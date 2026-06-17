function hashFilterParams(params: Record<string, string | undefined>): string {
  const serialized = Object.entries(params)
    .filter(([, value]) => value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  if (!serialized) {
    return "default";
  }

  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash << 5) - hash + serialized.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

export function buildDashboardCacheKey(
  organizationId: string,
  period: string,
  params: Record<string, string | undefined>,
) {
  return `analytics:org:${organizationId}:dashboard:${period}:${hashFilterParams(params)}`;
}

export function buildBranchCacheKey(
  organizationId: string,
  branchId: string | undefined,
  period: string,
  params: Record<string, string | undefined>,
) {
  return `analytics:org:${organizationId}:branch:${branchId ?? "all"}:${period}:${hashFilterParams(params)}`;
}

export function buildHostCacheKey(
  organizationId: string,
  hostId: string | undefined,
  period: string,
  params: Record<string, string | undefined>,
) {
  return `analytics:org:${organizationId}:host:${hostId ?? "all"}:${period}:${hashFilterParams(params)}`;
}

export function buildAuditCacheKey(
  organizationId: string,
  period: string,
  params: Record<string, string | undefined>,
) {
  return `analytics:org:${organizationId}:audit:${period}:${hashFilterParams(params)}`;
}

/** @deprecated Use scoped key builders from this module instead. */
export function buildAnalyticsCacheKey(
  organizationId: string,
  scope: string,
  params: Record<string, string | undefined>,
) {
  const period = params.period ?? "monthly";
  const hash = hashFilterParams(params);

  if (scope === "dashboard") {
    return buildDashboardCacheKey(organizationId, period, params);
  }
  if (scope === "branches") {
    return buildBranchCacheKey(organizationId, params.branchId, period, params);
  }
  if (scope === "hosts") {
    return buildHostCacheKey(organizationId, params.hostId, period, params);
  }
  if (scope === "audit") {
    return buildAuditCacheKey(organizationId, period, params);
  }

  return `analytics:org:${organizationId}:${scope}:${period}:${hash}`;
}

export function analyticsCachePattern(
  organizationId: string,
  scope: "dashboard" | "branch" | "host" | "audit",
) {
  return `analytics:org:${organizationId}:${scope}:`;
}
