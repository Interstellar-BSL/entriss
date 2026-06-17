import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isPlatformAdmin,
  isPlatformAdminPath,
} from "@/lib/platform/access";
import {
  claimsFromJwtToken,
  isOnboardingPath,
  isPublicApiPath,
  isPublicUiPath,
  resolveMiddlewareOrganizationContext,
} from "@/lib/tenant/middleware-org-resolution";
import {
  injectRequestContextHeaders,
  stripUntrustedContextHeaders,
} from "@/lib/tenant/request-headers";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApiPath(pathname, request.method)) {
    return NextResponse.next();
  }

  if (isPublicUiPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_MISCONFIGURED", message: "Auth is not configured" },
      },
      { status: 500 },
    );
  }

  const token = await getToken({ req: request, secret });
  const claims = claimsFromJwtToken(token ?? {});

  if (isPlatformAdminPath(pathname)) {
    if (!claims) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
          },
          { status: 401 },
        );
      }

      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!isPlatformAdmin(claims.systemRole)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Platform administrator access required",
            },
          },
          { status: 403 },
        );
      }

      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  if (!claims) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isPlatformAdmin(claims.systemRole) &&
    !claims.organizationId &&
    !isPlatformAdminPath(pathname)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PLATFORM_ADMIN_TENANT_FORBIDDEN",
            message: "Platform administrators must use the admin portal",
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  const orgResolution = resolveMiddlewareOrganizationContext({
    pathname,
    method: request.method,
    claims,
  });

  if (orgResolution.missingOrganizationContext) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ORGANIZATION_REQUIRED",
            message: "An organization context is required",
          },
        },
        { status: 403 },
      );
    }

    if (!isOnboardingPath(pathname)) {
      return NextResponse.redirect(new URL("/request-access", request.url));
    }
  }

  if (orgResolution.organizationNotApproved) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ORGANIZATION_NOT_APPROVED",
            message: "Organization access is not approved",
          },
        },
        { status: 403 },
      );
    }

    if (!isOnboardingPath(pathname)) {
      return NextResponse.redirect(new URL("/request-access", request.url));
    }
  }

  if (orgResolution.tenantMismatch) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TENANT_MISMATCH",
          message: "Cross-tenant access denied",
        },
      },
      { status: 403 },
    );
  }

  const requestHeaders = new Headers(request.headers);
  stripUntrustedContextHeaders(requestHeaders);

  const resolvedOrganizationId = orgResolution.resolvedOrganizationId;

  if (resolvedOrganizationId && claims.organizationStatus === "APPROVED") {
    injectRequestContextHeaders(requestHeaders, {
      userId: claims.userId,
      email: claims.email,
      systemRole: claims.systemRole,
      organizationId: resolvedOrganizationId,
      role: claims.role,
    });
  } else {
    requestHeaders.set("x-user-id", claims.userId);
    requestHeaders.set("x-user-email", claims.email);

    if (resolvedOrganizationId) {
      requestHeaders.set("x-organization-id", resolvedOrganizationId);
    }

    if (claims.systemRole) {
      requestHeaders.set("x-system-role", claims.systemRole);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/admin",
    "/admin/:path*",
    "/",
    "/visitors",
    "/visits",
    "/visits/:path*",
    "/reception",
    "/analytics",
    "/notifications",
    "/approvals",
    "/onboarding",
    "/signup",
    "/request-access",
    "/request-access/:path*",
    "/login",
    "/invite",
    "/invite/:path*",
    "/accept-invite",
    "/setup-password",
    "/kiosk",
    "/kiosk/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
