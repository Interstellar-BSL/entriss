import { prisma } from "@/lib/db/client";
import { writePlatformAuditLog } from "@/lib/platform/audit";
import { emitPlatformNotification } from "@/lib/notifications/platform-projector";
import type { CreateOrganizationRequestInput } from "@/lib/validations/organization-request";

import { ServiceError } from "./errors";

async function assertNoDuplicateRequest(input: CreateOrganizationRequestInput) {
  const normalizedContactEmail = input.contactEmail.toLowerCase();

  const [existingOrg, pendingByName, pendingByEmail] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        name: { equals: input.organizationName, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    }),
    prisma.organizationRequest.findFirst({
      where: {
        status: "PENDING",
        organizationName: { equals: input.organizationName, mode: "insensitive" },
      },
      select: { id: true },
    }),
    prisma.organizationRequest.findFirst({
      where: {
        status: "PENDING",
        contactEmail: normalizedContactEmail,
      },
      select: { id: true },
    }),
  ]);

  if (existingOrg || pendingByName) {
    throw new ServiceError(
      "ORG_NAME_TAKEN",
      "An organization with this name already exists or is pending review",
    );
  }

  if (pendingByEmail) {
    throw new ServiceError(
      "CONTACT_EMAIL_PENDING",
      "A pending request already exists for this contact email",
    );
  }
}

export async function createOrganizationRequest(
  input: CreateOrganizationRequestInput,
) {
  await assertNoDuplicateRequest(input);

  const request = await prisma.organizationRequest.create({
    data: {
      organizationName: input.organizationName,
      organizationEmail: input.organizationEmail,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      requestedPlan: input.requestedPlan ?? null,
      status: "PENDING",
    },
  });

  await writePlatformAuditLog({
    action: "ORG_REQUEST_CREATED",
    resourceType: "OrganizationRequest",
    resourceId: request.id,
    metadata: {
      organizationName: request.organizationName,
      contactEmail: request.contactEmail,
    },
  });

  emitPlatformNotification({
    kind: "ORG_ONBOARDING_REQUESTED",
    requestId: request.id,
    organizationName: request.organizationName,
    contactEmail: request.contactEmail,
    contactPerson: request.contactPerson,
  });

  return request;
}

export async function listOrganizationRequests(status?: "PENDING" | "APPROVED" | "REJECTED") {
  return prisma.organizationRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });
}
