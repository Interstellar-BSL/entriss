import type { SystemRole } from "@/app/generated/prisma/enums";

export function isPlatformAdmin(
  systemRole: SystemRole | null | undefined,
): boolean {
  return systemRole === "PLATFORM_ADMIN" || systemRole === "SYSTEM_OWNER";
}

export const PLATFORM_ADMIN_API_PREFIX = "/api/v1/admin";
export const PLATFORM_ADMIN_UI_PREFIX = "/admin";

export function isPlatformAdminApiPath(pathname: string): boolean {
  return pathname.startsWith(PLATFORM_ADMIN_API_PREFIX);
}

export function isPlatformAdminUiPath(pathname: string): boolean {
  return (
    pathname === PLATFORM_ADMIN_UI_PREFIX ||
    pathname.startsWith(`${PLATFORM_ADMIN_UI_PREFIX}/`)
  );
}

export function isPlatformAdminPath(pathname: string): boolean {
  return isPlatformAdminApiPath(pathname) || isPlatformAdminUiPath(pathname);
}

export function isPublicUnauthenticatedApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/public/");
}
