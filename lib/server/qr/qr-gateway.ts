import { prisma } from "@/lib/db/client";
import { QRError } from "@/lib/server/errors/qr.errors";
import { visitInclude, type VisitWithRelations } from "@/lib/services/internal/visit-include";
import { logQrScanAttempt } from "@/lib/services/internal/qr-audit";
import { VisitNotFoundError } from "@/lib/services/errors";
import type { TenantContext } from "@/lib/tenant/tenant-context";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import { qrTokenSchema } from "@/lib/validations/operations";

import { verifyVisitQR, type VerifyVisitQRResult } from "./verifyVisitQR";

export type QrGatewayAction = "check_in" | "check_out" | "verify";

export interface QrGatewayMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  action?: QrGatewayAction;
}

export interface ResolvedVisitFromQr {
  visit: VisitWithRelations;
  token: string;
  verification: VerifyVisitQRResult;
}

async function loadVisitForQr(
  ctx: TenantContext,
  visitId: string,
): Promise<VisitWithRelations | null> {
  return prisma.visit.findFirst({
    where: {
      id: visitId,
      organizationId: ctx.organizationId,
    },
    include: visitInclude,
  });
}

async function logInvalidQrAttempt(
  ctx: TenantContext,
  token: string,
  action: QrGatewayAction,
  reason: string,
  meta?: QrGatewayMeta,
  visitId?: string,
) {
  await logQrScanAttempt(ctx, {
    valid: false,
    qrToken: token,
    action,
    reason,
    visitId,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
}

/**
 * Mandatory QR entry point: verify signature + tenant, then resolve visit.
 */
export async function resolveVisitFromQrGateway(
  ctx: TenantContext,
  qrToken: string,
  meta?: QrGatewayMeta,
): Promise<ResolvedVisitFromQr> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const { qrToken: token } = qrTokenSchema.parse({ qrToken });
  const action = meta?.action ?? "verify";

  try {
    const verification = verifyVisitQR(token, ctx.organizationId);

    const visit = await loadVisitForQr(ctx, verification.visitId);

    if (!visit) {
      await logInvalidQrAttempt(
        ctx,
        token,
        action,
        "Visit not found for verified token",
        meta,
        verification.visitId,
      );
      throw new VisitNotFoundError(verification.visitId);
    }

    const resolvedVisit: VisitWithRelations = visit;

    if (resolvedVisit.qrToken && resolvedVisit.qrToken !== token) {
      await logInvalidQrAttempt(
        ctx,
        token,
        action,
        "QR token revoked or rotated",
        meta,
        resolvedVisit.id,
      );
      throw new QRError("QR_REVOKED");
    }

    if (
      verification.branchId &&
      resolvedVisit.branchId !== verification.branchId
    ) {
      await logInvalidQrAttempt(
        ctx,
        token,
        action,
        "QR branch mismatch",
        meta,
        resolvedVisit.id,
      );
      throw new QRError("QR_TENANT_MISMATCH");
    }

    await logQrScanAttempt(ctx, {
      valid: true,
      qrToken: token,
      action,
      visitId: resolvedVisit.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      visit: resolvedVisit,
      token,
      verification,
    };
  } catch (error) {
    if (error instanceof QRError) {
      await logInvalidQrAttempt(
        ctx,
        token,
        action,
        error.message,
        meta,
      );
    }

    throw error;
  }
}
