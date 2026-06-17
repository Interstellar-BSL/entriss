import { writeAuditLog } from "@/lib/audit/logger";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { recordVisitEvent } from "./visit-events";

export interface QrScanAuditInput {
  valid: boolean;
  qrToken: string;
  reason?: string;
  visitId?: string;
  action: "check_in" | "check_out" | "verify";
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logQrScanAttempt(
  ctx: TenantContext,
  input: QrScanAuditInput,
): Promise<void> {
  const action = input.valid
    ? `qr.${input.action}.success`
    : `qr.${input.action}.failed`;

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action,
    resourceType: "Visit",
    resourceId: input.visitId ?? "unknown",
    metadata: {
      valid: input.valid,
      reason: input.reason ?? null,
      tokenPrefix: input.qrToken.slice(0, 24),
      scanAction: input.action,
    },
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });

  if (input.visitId) {
    await recordVisitEvent(
      ctx.organizationId,
      input.visitId,
      input.valid ? "qr.scan.success" : "qr.scan.failed",
      {
        action: input.action,
        reason: input.reason ?? null,
      },
      ctx.userId,
    );
  }
}
