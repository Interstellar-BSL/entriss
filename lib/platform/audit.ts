import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit/logger";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant/constants";

/**
 * Platform-scoped audit entries are stored against the bootstrap org id.
 */
export async function writePlatformAuditLog(input: {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await writeAuditLog({
    organizationId: input.organizationId ?? DEFAULT_ORGANIZATION_ID,
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata ?? {},
  });
}
