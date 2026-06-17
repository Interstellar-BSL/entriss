import type { Prisma } from "@/app/generated/prisma/client";
import type { VisitStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/db/client";

export async function recordVisitEvent(
  organizationId: string,
  visitId: string,
  type: string,
  payload: Prisma.InputJsonValue,
  actorId?: string,
): Promise<void> {
  await prisma.visitEvent.create({
    data: {
      organizationId,
      visitId,
      type,
      payload,
      actorId: actorId ?? null,
    },
  });
}

export async function recordVisitStatusChange(
  organizationId: string,
  visitId: string,
  from: VisitStatus,
  to: VisitStatus,
  actorId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordVisitEvent(
    organizationId,
    visitId,
    "status_changed",
    {
      from,
      to,
      ...metadata,
    },
    actorId,
  );
}
