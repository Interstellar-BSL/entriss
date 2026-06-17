import { requirePlatformAdmin, PlatformAdminError } from "@/lib/auth/require-platform-admin";
import { handleApiError } from "@/lib/api/response";

type PlatformAdminHandler = (
  request: Request,
  admin: Awaited<ReturnType<typeof requirePlatformAdmin>>,
) => Promise<Response>;

type PlatformAdminParamsHandler<P extends Record<string, string>> = (
  request: Request,
  admin: Awaited<ReturnType<typeof requirePlatformAdmin>>,
  params: P,
) => Promise<Response>;

export function withPlatformAdmin(handler: PlatformAdminHandler) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    try {
      const admin = await requirePlatformAdmin();
      return await handler(request, admin);
    } catch (err) {
      console.error("[platform-admin] request failed:", {
        method: request.method,
        path,
        error: err instanceof Error ? err.message : err,
      });
      if (err instanceof PlatformAdminError) {
        return handleApiError(new Error(err.message));
      }
      return handleApiError(err);
    }
  };
}

export function withPlatformAdminParams<P extends Record<string, string>>(
  handler: PlatformAdminParamsHandler<P>,
) {
  return async (
    request: Request,
    routeContext: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const admin = await requirePlatformAdmin();
      const params = await routeContext.params;
      return await handler(request, admin, params);
    } catch (err) {
      const path = new URL(request.url).pathname;
      console.error("[platform-admin] request failed:", {
        method: request.method,
        path,
        error: err instanceof Error ? err.message : err,
      });
      if (err instanceof PlatformAdminError) {
        return handleApiError(new Error(err.message));
      }
      return handleApiError(err);
    }
  };
}
