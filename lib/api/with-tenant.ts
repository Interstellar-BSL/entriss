import {
  requireRequestContext,
  requireTenantContext,
} from "@/lib/auth/session";
import type { RequestContext } from "@/lib/tenant/request-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { handleApiError } from "./response";

type TenantHandler = (
  request: Request,
  ctx: TenantContext,
) => Promise<Response>;

type RequestContextHandler = (
  request: Request,
  ctx: RequestContext,
) => Promise<Response>;

type TenantParamsHandler<P extends Record<string, string>> = (
  request: Request,
  ctx: TenantContext,
  params: P,
) => Promise<Response>;

type RequestContextParamsHandler<P extends Record<string, string>> = (
  request: Request,
  ctx: RequestContext,
  params: P,
) => Promise<Response>;

export function withTenant(handler: TenantHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const ctx = await requireTenantContext(request);
      return await handler(request, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

/**
 * API wrapper that receives the full Phase 7.2 request context
 * (middleware-injected when available, session fallback otherwise).
 */
export function withRequestContext(handler: RequestContextHandler) {
  return async (request: Request): Promise<Response> => {
    try {
      const ctx = await requireRequestContext(request);
      return await handler(request, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function withTenantParams<P extends Record<string, string>>(
  handler: TenantParamsHandler<P>,
) {
  return async (
    request: Request,
    routeContext: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const ctx = await requireTenantContext(request);
      const params = await routeContext.params;
      return await handler(request, ctx, params);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function withRequestContextParams<P extends Record<string, string>>(
  handler: RequestContextParamsHandler<P>,
) {
  return async (
    request: Request,
    routeContext: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const ctx = await requireRequestContext(request);
      const params = await routeContext.params;
      return await handler(request, ctx, params);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
