import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  isPrismaKnownRequestError,
  isPrismaValidationError,
  prismaErrorDetails,
} from "@/lib/db/prisma-errors";

import {
  AuthenticationError,
  OrganizationContextError,
  TenantSessionInvalidError,
} from "@/lib/auth/session";
import { PlatformAdminError } from "@/lib/auth/require-platform-admin";
import {
  OrgApprovalError,
  ServiceError,
  VisitorIdentityConflictError,
} from "@/lib/services/errors";
import { PolicyError } from "@/lib/server/errors/policy.errors";
import { QRError } from "@/lib/server/errors/qr.errors";
import type { VisitState } from "@/lib/server/visits/visit-states";
import {
  PermissionDeniedError,
  TenantAccessError,
} from "@/lib/tenant/tenant-context";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessBody<T> {
  success: true;
  state?: VisitState;
  data: T;
}

export interface ApiFailureBody {
  success: false;
  state?: VisitState;
  error: ApiErrorBody;
}

export function success<T>(data: T, status = 200, state?: VisitState) {
  return NextResponse.json(
    {
      success: true,
      ...(state ? { state } : {}),
      data,
    } satisfies ApiSuccessBody<T>,
    { status },
  );
}

export function error(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown,
  state?: VisitState,
) {
  return NextResponse.json(
    {
      success: false,
      ...(state ? { state } : {}),
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    } satisfies ApiFailureBody,
    { status: statusCode },
  );
}

/** @deprecated Use success() */
export const apiSuccess = success;

/** @deprecated Use error() */
export const apiError = error;

export function handleApiError(err: unknown) {
  if (err instanceof AuthenticationError) {
    return error("UNAUTHORIZED", err.message, 401);
  }

  if (err instanceof OrganizationContextError) {
    return error("ORGANIZATION_REQUIRED", err.message, 403);
  }

  if (err instanceof TenantSessionInvalidError) {
    return error("TENANT_SESSION_INVALID", err.message, 403);
  }

  if (err instanceof PlatformAdminError) {
    return error("FORBIDDEN", err.message, 403);
  }

  if (
    err instanceof PermissionDeniedError ||
    (err instanceof Error && err.name === "PermissionDeniedError")
  ) {
    return error("FORBIDDEN", err.message, 403);
  }

  if (err instanceof TenantAccessError) {
    return error("TENANT_MISMATCH", err.message, 403);
  }

  if (err instanceof ZodError) {
    return error("VALIDATION_ERROR", "Invalid request", 400, err.flatten());
  }

  if (isPrismaValidationError(err)) {
    console.error("[api] Prisma validation error:", err);
    return error(
      "PRISMA_CLIENT_OUT_OF_DATE",
      "Server Prisma client is out of date. Run `npx prisma generate` and restart the dev server.",
      500,
    );
  }

  if (isPrismaKnownRequestError(err)) {
    const details = prismaErrorDetails(err);

    console.error("[api] Prisma database error:", {
      ...details,
      stack: err instanceof Error ? err.stack : undefined,
    });

    if (err.code === "P2021" || err.code === "P2022") {
      const target = details.table ?? details.column ?? details.modelName ?? "schema";
      return error(
        "SCHEMA_OUT_OF_DATE",
        `Database schema is out of date (missing: ${target}). Run \`npx prisma migrate deploy\` and restart the server.`,
        500,
        process.env.NODE_ENV === "development" ? details : undefined,
      );
    }

    return error(
      "DATABASE_ERROR",
      "A database error occurred while processing the request",
      500,
      process.env.NODE_ENV === "development" ? details : undefined,
    );
  }

  if (err instanceof VisitorIdentityConflictError) {
    return error(err.code, err.message, 409, { visitor: err.visitor });
  }

  if (err instanceof PolicyError) {
    return error(err.policyCode, err.message, 422, undefined, err.visitState);
  }

  if (err instanceof QRError) {
    const statusCode =
      err.qrCode === "QR_EXPIRED"
        ? 410
        : err.qrCode === "QR_TENANT_MISMATCH"
          ? 403
          : err.qrCode === "QR_INVALID_SIGNATURE"
            ? 401
            : 400;

    return error(err.qrCode, err.message, statusCode);
  }

  if (err instanceof OrgApprovalError) {
    return error(err.code, err.message, 500, { step: err.step });
  }

  if (err instanceof ServiceError) {
    const statusCode =
      err.code === "RATE_LIMITED"
        ? 429
        : err.code === "VISITOR_NOT_FOUND" ||
            err.code === "VISITOR_NOTE_NOT_FOUND" ||
            err.code === "VISIT_NOT_FOUND" ||
            err.code === "BRANCH_NOT_FOUND"
          ? 404
          : err.code === "BRANCH_CODE_TAKEN" || err.code === "BRANCH_CONFLICT"
            ? 409
            : 400;

    const response = error(err.code, err.message, statusCode);

    if (err.code === "RATE_LIMITED" && "retryAfterSeconds" in err) {
      response.headers.set(
        "Retry-After",
        String((err as ServiceError & { retryAfterSeconds: number }).retryAfterSeconds),
      );
    }

    return response;
  }

  if (err instanceof Error) {
    console.error("[api] Unhandled error:", err.message, err.stack);
  } else {
    console.error("[api] Unhandled error:", err);
  }

  return error("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

export function getRequestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown",
    userAgent: request.headers.get("user-agent"),
  };
}
