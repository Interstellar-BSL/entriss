import { enforceApiRateLimit } from "@/lib/api/rate-limit";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  checkInWithQR,
  checkInWithVisitId,
  checkOutWithQR,
  checkOutWithVisitId,
} from "@/lib/services/visit.service";
import type { checkInRequestSchema, checkOutRequestSchema } from "@/lib/validations/api";
import type { z } from "zod";

const CHECK_IN_RATE_LIMIT = { max: 30, windowMs: 60_000 };
const CHECK_OUT_RATE_LIMIT = { max: 30, windowMs: 60_000 };

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

function enforceCheckInRateLimit(ctx: TenantContext, ip: string) {
  enforceApiRateLimit(
    "check-in",
    `${ctx.organizationId}:${ctx.userId}:${ip}`,
    CHECK_IN_RATE_LIMIT.max,
    CHECK_IN_RATE_LIMIT.windowMs,
  );
}

function enforceCheckOutRateLimit(ctx: TenantContext, ip: string) {
  enforceApiRateLimit(
    "check-out",
    `${ctx.organizationId}:${ctx.userId}:${ip}`,
    CHECK_OUT_RATE_LIMIT.max,
    CHECK_OUT_RATE_LIMIT.windowMs,
  );
}

export async function processCheckIn(
  ctx: TenantContext,
  input: z.infer<typeof checkInRequestSchema>,
  meta: RequestMeta,
) {
  enforceCheckInRateLimit(ctx, meta.ipAddress ?? "unknown");

  if (input.qrToken) {
    return checkInWithQR(ctx, input.qrToken, {
      ...meta,
      source: input.source ?? "kiosk",
      photoUrl: input.photoUrl,
      documents: input.documents,
    });
  }

  return checkInWithVisitId(ctx, input.visitId!, {
    ...meta,
    source: input.source ?? "api",
    photoUrl: input.photoUrl,
    documents: input.documents,
  });
}

export async function processCheckOut(
  ctx: TenantContext,
  input: z.infer<typeof checkOutRequestSchema>,
  meta: RequestMeta,
) {
  enforceCheckOutRateLimit(ctx, meta.ipAddress ?? "unknown");

  if (input.qrToken) {
    return checkOutWithQR(ctx, input.qrToken, meta);
  }

  return checkOutWithVisitId(ctx, input.visitId!, meta);
}
