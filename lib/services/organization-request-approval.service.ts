import { InviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { DbExecutor } from "@/lib/db/transaction";
import { isPrismaKnownRequestError } from "@/lib/db/prisma-errors";
import { writeAuditLog } from "@/lib/audit/logger";
import {
  buildSetupPasswordAbsoluteUrl,
  sendOrganizationApprovalEmail,
  sendOrganizationRejectionEmail,
} from "@/lib/organization/approval-email";
import { writePlatformAuditLog } from "@/lib/platform/audit";
import { emitPlatformNotification } from "@/lib/notifications/platform-projector";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/roles";
import {
  assignOrganizationRolePermissions,
  RoleProvisioningError,
} from "@/lib/seed/roles";
import { seedPermissions } from "@/lib/seed/permissions";
import { slugifyOrganizationName } from "@/lib/services/org-slug";
import { INVITE_TTL_DAYS } from "@/lib/services/organization.service";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/lib/security/invite-token";

import { OrgApprovalError, type OrgApprovalStep, ServiceError } from "./errors";

const CORE_TX_OPTIONS = { timeout: 15_000, maxWait: 5_000 } as const;

function mapPrismaErrorToApprovalStep(
  error: unknown,
  step: OrgApprovalStep,
): never {
  if (isPrismaKnownRequestError(error) && error.code === "P2002") {
    throw new ServiceError(
      "ORG_SLUG_TAKEN",
      "An organization with this slug already exists",
    );
  }

  if (isPrismaKnownRequestError(error) && error.code === "P2003") {
    throw new OrgApprovalError(
      step,
      `Foreign key constraint failed during ${step.replace("_", " ")}`,
    );
  }

  if (isPrismaKnownRequestError(error) && error.code === "P2028") {
    throw new OrgApprovalError(
      step,
      `Database transaction timed out during ${step.replace("_", " ")}`,
    );
  }

  const message =
    error instanceof Error ? error.message : "Organization approval failed";

  console.error(`APPROVAL STEP FAILED: ${step}`, error);
  throw new OrgApprovalError(step, message);
}

async function resolveUniqueOrganizationSlug(
  db: Pick<DbExecutor, "organization">,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await db.organization.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    const suffix = `-${counter}`;
    slug = `${baseSlug.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;
    counter += 1;
  }
}

async function resolveOrCreateOrganization(
  tx: DbExecutor,
  request: {
    id: string;
    organizationName: string;
    organizationEmail: string;
    requestedPlan: string | null;
    createdOrganizationId: string | null;
  },
): Promise<{
  organization: { id: string; name: string; slug: string };
  orgCreated: boolean;
}> {
  let organizationId = request.createdOrganizationId;
  let organization: { id: string; name: string; slug: string } | null = null;
  let orgCreated = false;

  if (organizationId) {
    organization = await tx.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
    if (!organization) {
      organizationId = null;
    }
  }

  if (!organization) {
    const byName = await tx.organization.findFirst({
      where: {
        name: { equals: request.organizationName, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true, name: true, slug: true },
    });

    if (byName) {
      organization = byName;
    } else {
      const baseSlug = slugifyOrganizationName(request.organizationName);
      const slug = await resolveUniqueOrganizationSlug(tx, baseSlug);

      organization = await tx.organization.create({
        data: {
          name: request.organizationName.trim(),
          slug,
          settings: {
            organizationEmail: request.organizationEmail,
            requestedPlan: request.requestedPlan,
            provisionedFromRequestId: request.id,
          },
          status: "APPROVED",
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      });
      orgCreated = true;
    }
  }

  if (!organization?.id) {
    throw new OrgApprovalError(
      "org_creation",
      "Could not resolve organization for this request",
    );
  }

  await tx.organization.findUniqueOrThrow({
    where: { id: organization.id },
    select: { id: true },
  });

  return { organization, orgCreated };
}

async function runPostApprovalSideEffects(input: {
  requestId: string;
  actorId: string;
  organizationId: string;
  organizationName: string;
  orgCreated: boolean;
  membershipId: string;
  adminUser: { id: string; email: string; name: string | null };
  rawInviteToken: string;
  notes?: string;
}) {
  if (input.orgCreated) {
    try {
      await writeAuditLog({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: "ORG_CREATED_FROM_REQUEST",
        resourceType: "Organization",
        resourceId: input.organizationId,
        metadata: { requestId: input.requestId },
      });
    } catch (auditError) {
      console.error("[org-request-approval] org created audit failed:", auditError);
    }
  }

  try {
    await writeAuditLog({
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "ORG_ADMIN_CREATED",
      resourceType: "OrganizationMember",
      resourceId: input.membershipId,
      metadata: {
        requestId: input.requestId,
        userId: input.adminUser.id,
        email: input.adminUser.email,
        passwordSetupPending: true,
      },
    });
  } catch (auditError) {
    console.error("[org-request-approval] admin created audit failed:", auditError);
  }

  try {
    await writePlatformAuditLog({
      actorId: input.actorId,
      action: "ORG_REQUEST_APPROVED",
      resourceType: "OrganizationRequest",
      resourceId: input.requestId,
      organizationId: input.organizationId,
      metadata: {
        organizationId: input.organizationId,
        notes: input.notes ?? null,
        passwordSetupPending: true,
      },
    });
  } catch (auditError) {
    console.error("[org-request-approval] platform audit failed:", auditError);
  }

  const setupPasswordUrl = buildSetupPasswordAbsoluteUrl(input.rawInviteToken);

  try {
    await sendOrganizationApprovalEmail({
      to: input.adminUser.email,
      contactName: input.adminUser.name ?? input.adminUser.email,
      organizationName: input.organizationName,
      setupPasswordUrl,
    });
  } catch (emailError) {
    console.error("[org-request-approval] approval email failed:", emailError);
  }

  emitPlatformNotification({
    kind: "ORG_APPROVED",
    requestId: input.requestId,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    contactEmail: input.adminUser.email,
  });

  return { setupPasswordUrl, emailSent: true };
}

export async function approveOrganizationRequest(
  requestId: string,
  actorId: string,
  notes?: string,
) {
  const request = await prisma.organizationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new ServiceError("ORG_REQUEST_NOT_FOUND", "Organization request not found");
  }

  if (request.status !== "PENDING") {
    throw new ServiceError(
      "ORG_REQUEST_NOT_PENDING",
      "Only pending requests can be approved",
    );
  }

  const rawInviteToken = generateInviteToken();
  const inviteTokenHash = hashInviteToken(rawInviteToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  console.log("APPROVAL STEP: permission catalog sync");
  const permissionMap = await seedPermissions(prisma);

  let organization: { id: string; name: string; slug: string };
  let orgCreated: boolean;

  try {
    console.log("APPROVAL STEP: org creation");
    const orgResult = await prisma.$transaction(
      async (tx) => resolveOrCreateOrganization(tx, request),
      CORE_TX_OPTIONS,
    );
    organization = orgResult.organization;
    orgCreated = orgResult.orgCreated;
  } catch (error) {
    if (error instanceof OrgApprovalError || error instanceof ServiceError) {
      throw error;
    }
    mapPrismaErrorToApprovalStep(error, "org_creation");
  }

  const organizationId = organization.id;

  console.log("APPROVAL STEP: role assignment");
  console.log("[ROLE ASSIGN] orgId =", organizationId);
  console.log("[ROLE ASSIGN] permissionCatalogSize =", permissionMap.size);

  let orgAdminRoleId: string;

  try {
    const roleIds = await assignOrganizationRolePermissions(prisma, organizationId, {
      permissionMap,
    });
    const resolvedRoleId = roleIds.get(SYSTEM_ROLE_SLUGS.ORG_ADMIN);
    if (!resolvedRoleId) {
      throw new OrgApprovalError(
        "role_assignment",
        "Organization Administrator role was not provisioned",
      );
    }
    orgAdminRoleId = resolvedRoleId;
  } catch (error) {
    if (error instanceof OrgApprovalError || error instanceof ServiceError) {
      throw error;
    }
    if (error instanceof RoleProvisioningError) {
      throw new OrgApprovalError("role_assignment", error.message);
    }
    mapPrismaErrorToApprovalStep(error, "role_assignment");
  }

  let result: {
    membership: { id: string };
    adminUser: { id: string; email: string; name: string | null };
  };

  try {
    result = await prisma.$transaction(async (tx) => {
      const otherMembership = await tx.organizationMember.findFirst({
        where: {
          user: { email: request.contactEmail },
          isActive: true,
          status: "ACTIVE",
          organizationId: { not: organizationId },
        },
        select: { id: true },
      });

      if (otherMembership) {
        throw new ServiceError(
          "USER_ORG_CONFLICT",
          "This user already belongs to another organization",
        );
      }

      console.log("APPROVAL STEP: user creation");

      const existingUser = await tx.user.findUnique({
        where: { email: request.contactEmail },
        select: { id: true, passwordHash: true },
      });

      if (existingUser?.passwordHash) {
        throw new ServiceError(
          "USER_ALREADY_EXISTS",
          "A user with this email already has an account. Use invite flow instead.",
        );
      }

      const adminUser = await tx.user.upsert({
        where: { email: request.contactEmail },
        create: {
          email: request.contactEmail,
          name: request.contactPerson,
          passwordHash: null,
          isActive: false,
        },
        update: {
          name: request.contactPerson,
          deletedAt: null,
          isActive: false,
        },
        select: { id: true, email: true, name: true },
      });

      console.log("APPROVAL STEP: membership creation");

      const membership = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: adminUser.id,
          },
        },
        create: {
          organizationId,
          userId: adminUser.id,
          roleId: orgAdminRoleId,
          status: "ACTIVE",
          isActive: true,
        },
        update: {
          roleId: orgAdminRoleId,
          status: "ACTIVE",
          isActive: true,
          deactivatedAt: null,
        },
        select: { id: true },
      });

      console.log("APPROVAL STEP: invite creation");

      await tx.organizationInvite.create({
        data: {
          organizationId,
          email: request.contactEmail,
          roleId: orgAdminRoleId,
          tokenHash: inviteTokenHash,
          invitedById: actorId,
          expiresAt,
          status: InviteStatus.PENDING,
        },
      });

      console.log("APPROVAL STEP: request update");

      await tx.organizationRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          approvedById: actorId,
          approvedAt: new Date(),
          approvalNotes: notes ?? null,
          createdOrganizationId: organizationId,
        },
      });

      return { membership, adminUser };
    }, CORE_TX_OPTIONS);
  } catch (error) {
    if (
      error instanceof OrgApprovalError ||
      error instanceof ServiceError ||
      isPrismaKnownRequestError(error)
    ) {
      if (isPrismaKnownRequestError(error) && error.code === "P2002") {
        throw new ServiceError(
          "ORG_SLUG_TAKEN",
          "An organization with this slug already exists",
        );
      }
      throw error;
    }

    console.error("[org-request-approval] identity transaction failed:", error);
    throw new OrgApprovalError(
      "request_update",
      error instanceof Error ? error.message : "Organization approval failed",
    );
  }

  const sideEffects = await runPostApprovalSideEffects({
    requestId: request.id,
    actorId,
    organizationId,
    organizationName: organization.name,
    orgCreated,
    membershipId: result.membership.id,
    adminUser: result.adminUser,
    rawInviteToken,
    notes,
  });

  const setupPasswordPath = `/setup-password?token=${encodeURIComponent(rawInviteToken)}`;

  return {
    organization,
    inviteToken: rawInviteToken,
    setupPasswordUrl: setupPasswordPath,
    adminEmail: result.adminUser.email,
    passwordSetupPending: true,
    emailSent: sideEffects.emailSent,
  };
}

export async function rejectOrganizationRequest(
  requestId: string,
  actorId: string,
  reason: string,
) {
  const request = await prisma.organizationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new ServiceError("ORG_REQUEST_NOT_FOUND", "Organization request not found");
  }

  if (request.status !== "PENDING") {
    throw new ServiceError(
      "ORG_REQUEST_NOT_PENDING",
      "Only pending requests can be rejected",
    );
  }

  const updated = await prisma.organizationRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      approvedById: actorId,
      approvedAt: new Date(),
    },
  });

  try {
    await writePlatformAuditLog({
      actorId,
      action: "ORG_REQUEST_REJECTED",
      resourceType: "OrganizationRequest",
      resourceId: requestId,
      metadata: { reason },
    });
  } catch (auditError) {
    console.error("[org-request-approval] rejection audit failed:", auditError);
  }

  try {
    await sendOrganizationRejectionEmail({
      to: request.contactEmail,
      contactName: request.contactPerson,
      organizationName: request.organizationName,
      reason,
    });
  } catch (emailError) {
    console.error("[org-request-approval] rejection email failed:", emailError);
  }

  emitPlatformNotification({
    kind: "ORG_REJECTED",
    requestId,
    organizationName: request.organizationName,
    contactEmail: request.contactEmail,
    reason,
  });

  return updated;
}
