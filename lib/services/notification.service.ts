import { prisma } from "@/lib/db/client";
import { safeCount, safeFindMany, type ScopedModel } from "@/lib/db/safe-query";
import {
  notificationTypesForCategory,
  resolveNotificationCategory,
} from "@/lib/notifications/categories";
import type { NotificationCategory } from "@/lib/notifications/types";
import { projectApprovalReminderNotifications } from "@/lib/notifications/projector";
import type { TenantContext } from "@/lib/tenant/tenant-context";

export type InAppNotificationType =
  | "visit_approval_required"
  | "visit_approved"
  | "visit_rejected"
  | "VISITOR_ARRIVED"
  | "APPROVAL_REQUEST"
  | "APPROVAL_REMINDER"
  | "VISIT_APPROVED"
  | "VISIT_REJECTED"
  | "VISIT_CANCELLED"
  | "VISIT_COMPLETED"
  | "SECURITY_OVERRIDE"
  | "ORG_ONBOARDING_REQUESTED"
  | "ORG_APPROVED"
  | "ORG_REJECTED"
  | "ORG_SUSPENDED"
  | "DUPLICATE_DETECTED"
  | "KIOSK_SESSION_FAILED";

export interface CreateNotificationInput {
  userId: string;
  type: InAppNotificationType | string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
}

export interface NotificationListItem {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  visitId: string | null;
  visitorId: string | null;
  readAt: string | null;
  createdAt: string;
}

function mapRowToListItem(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  resourceType: string | null;
  resourceId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationListItem {
  const visitId =
    row.resourceType === "Visit" ? row.resourceId : null;
  const visitorId =
    row.resourceType === "Visitor" ? row.resourceId : null;

  return {
    id: row.id,
    type: row.type,
    category: resolveNotificationCategory(row.type),
    title: row.title,
    message: row.body,
    visitId,
    visitorId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createInAppNotification(
  ctx: TenantContext,
  input: CreateNotificationInput,
) {
  return prisma.appNotification.create({
    data: {
      organizationId: ctx.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    },
  });
}

export async function createInAppNotifications(
  ctx: TenantContext,
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) {
    return [];
  }

  await prisma.appNotification.createMany({
    data: uniqueUserIds.map((userId) => ({
      organizationId: ctx.organizationId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    })),
  });

  return uniqueUserIds;
}

export async function listInAppNotifications(
  ctx: TenantContext,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    category?: NotificationCategory;
  },
) {
  void projectApprovalReminderNotifications(ctx).catch((error) => {
    console.error("[notifications] approval reminder projection failed", error);
  });

  const limit = Math.min(options?.limit ?? 50, 100);
  const types = options?.category
    ? notificationTypesForCategory(options.category)
    : undefined;

  const rows = await safeFindMany(
    ctx,
    prisma.appNotification as unknown as ScopedModel<{
      id: string;
      type: string;
      title: string;
      body: string;
      resourceType: string | null;
      resourceId: string | null;
      readAt: Date | null;
      createdAt: Date;
    }>,
    "appNotification",
    {
      where: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        ...(options?.unreadOnly ? { readAt: null } : {}),
        ...(types ? { type: { in: types } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    },
  );

  return rows.map(mapRowToListItem);
}

export async function countUnreadNotifications(ctx: TenantContext) {
  return safeCount(
    ctx,
    prisma.appNotification as unknown as { count: (args?: unknown) => Promise<number> },
    "appNotification",
    {
      where: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        readAt: null,
      },
    },
  );
}

export async function markNotificationRead(
  ctx: TenantContext,
  notificationId: string,
) {
  return prisma.appNotification.updateMany({
    where: {
      id: notificationId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(ctx: TenantContext) {
  return prisma.appNotification.updateMany({
    where: {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
