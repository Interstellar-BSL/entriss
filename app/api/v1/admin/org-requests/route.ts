import { withPlatformAdmin } from "@/lib/api/with-platform-admin";
import { success } from "@/lib/api/response";
import { safeQuery } from "@/lib/db/safe-query";
import { listOrganizationRequests } from "@/lib/services/organization-request.service";

export const GET = withPlatformAdmin(async (request) => {
  const status = new URL(request.url).searchParams.get("status");
  const normalizedStatus =
    status === "PENDING" || status === "APPROVED" || status === "REJECTED"
      ? status
      : undefined;

  const unavailableMetrics: string[] = [];
  const items = await safeQuery(
    "listOrganizationRequests",
    () => listOrganizationRequests(normalizedStatus),
    [],
    unavailableMetrics,
  );

  return success({
    items: items.map((item) => ({
      id: item.id,
      organizationName: item.organizationName,
      organizationEmail: item.organizationEmail,
      contactPerson: item.contactPerson,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      requestedPlan: item.requestedPlan,
      status: item.status,
      rejectionReason: item.rejectionReason,
      approvalNotes: item.approvalNotes,
      createdOrganizationId: item.createdOrganizationId,
      createdAt: item.createdAt.toISOString(),
      approvedAt: item.approvedAt?.toISOString() ?? null,
      approvedBy: item.approvedBy
        ? {
            id: item.approvedBy.id,
            name: item.approvedBy.name,
            email: item.approvedBy.email,
          }
        : null,
    })),
    degraded: unavailableMetrics.length > 0,
    unavailableMetrics,
  });
});