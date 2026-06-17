import { prisma } from "@/lib/db/client";
import { resolveBranchConfig } from "@/lib/settings/resolver";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import {
  encodeVisitQrToken,
  type VisitQRPayload,
} from "@/lib/server/qr/qr-token-codec";
import {
  verifyVisitQR,
  type VerifyVisitQRResult,
} from "@/lib/server/qr/verifyVisitQR";

import { VisitNotFoundError } from "./errors";

const SCHEDULED_QR_GRACE_HOURS = 4;
const DEFAULT_QR_EXPIRY_MINUTES = 1440;

export type { VisitQRPayload, VerifyVisitQRResult };
export { verifyVisitQR } from "@/lib/server/qr/verifyVisitQR";

export interface GenerateVisitQRResult {
  token: string;
  payload: VisitQRPayload;
  expiresAt: Date;
  visitId: string;
}

export function resolveQrExpiration(input: {
  scheduledAt: Date | null;
  qrExpiryMinutes: number;
}): Date {
  const now = Date.now();

  if (input.scheduledAt) {
    const scheduledExpiry =
      input.scheduledAt.getTime() + SCHEDULED_QR_GRACE_HOURS * 60 * 60 * 1000;
    return new Date(Math.max(scheduledExpiry, now + 60 * 60 * 1000));
  }

  const ttlMinutes = input.qrExpiryMinutes || DEFAULT_QR_EXPIRY_MINUTES;
  return new Date(now + ttlMinutes * 60 * 1000);
}

/**
 * Generates a tamper-proof signed QR token for a visit and persists it.
 */
export async function generateVisitQR(
  ctx: TenantContext,
  visitId: string,
): Promise<GenerateVisitQRResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      organizationId: ctx.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      scheduledAt: true,
    },
  });

  if (!visit) {
    throw new VisitNotFoundError(visitId);
  }

  const branchConfig = await resolveBranchConfig(ctx, visit.branchId);

  const expiresAt = resolveQrExpiration({
    scheduledAt: visit.scheduledAt,
    qrExpiryMinutes: branchConfig.qrExpiryMinutes,
  });

  const issuedAt = Math.floor(Date.now() / 1000);

  const payload: VisitQRPayload = {
    v: 1,
    visitId: visit.id,
    organizationId: visit.organizationId,
    orgId: visit.organizationId,
    branchId: visit.branchId,
    iat: issuedAt,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  const token = encodeVisitQrToken(payload);

  await prisma.visit.update({
    where: {
      id: visit.id,
      organizationId: ctx.organizationId,
    },
    data: {
      qrToken: token,
      qrExpiresAt: expiresAt,
    },
  });

  return {
    token,
    payload,
    expiresAt,
    visitId: visit.id,
  };
}

/**
 * Ensures a visit has a valid QR token, regenerating if missing or expired.
 */
export async function ensureVisitQR(
  ctx: TenantContext,
  visitId: string,
): Promise<GenerateVisitQRResult> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      organizationId: ctx.organizationId,
    },
    select: {
      id: true,
      qrToken: true,
      qrExpiresAt: true,
    },
  });

  if (!visit) {
    throw new VisitNotFoundError(visitId);
  }

  if (
    visit.qrToken &&
    visit.qrExpiresAt &&
    visit.qrExpiresAt.getTime() > Date.now()
  ) {
    try {
      const verified = verifyVisitQR(visit.qrToken, ctx.organizationId);
      return {
        token: visit.qrToken,
        payload: verified.payload,
        expiresAt: verified.expiresAt,
        visitId: visit.id,
      };
    } catch {
      // Regenerate below when token is invalid or expired.
    }
  }

  return generateVisitQR(ctx, visitId);
}
