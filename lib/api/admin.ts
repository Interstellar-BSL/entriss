import { apiFetch } from "./client";

export interface PlatformDashboardMetrics {
  totalOrganizations: number;
  pendingRequests: number;
  approvedOrganizations: number;
  suspendedOrganizations: number;
  usage: {
    totalVisitors: number;
    totalVisits: number;
    activeOrganizations: number;
  };
  health: {
    lastOrganizationCreatedAt: string | null;
    lastOrganizationName: string | null;
    lastLoginAt: string | null;
    lastLoginEmail: string | null;
    systemStatus: string;
  };
  degraded?: boolean;
  unavailableMetrics?: string[];
}

export interface PlatformListResponse<T> {
  items: T[];
  degraded?: boolean;
  unavailableMetrics?: string[];
}

export interface OrganizationRequestSummary {
  id: string;
  organizationName: string;
  organizationEmail: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string | null;
  requestedPlan: string | null;
  status: string;
  rejectionReason: string | null;
  approvalNotes: string | null;
  createdOrganizationId: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: { id: string; name: string | null; email: string } | null;
}

export interface PlatformOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount: number;
}

export function getAdminDashboardMetrics() {
  return apiFetch<PlatformDashboardMetrics>("/api/v1/admin/dashboard");
}

export function listAdminOrgRequests(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<PlatformListResponse<OrganizationRequestSummary>>(
    `/api/v1/admin/org-requests${query}`,
  );
}

export function approveAdminOrgRequest(id: string, notes?: string) {
  return apiFetch<{
    organization: { id: string; name: string; slug: string };
    inviteToken: string;
    setupPasswordUrl: string;
    adminEmail: string;
    passwordSetupPending: boolean;
    emailSent: boolean;
  }>(`/api/v1/admin/org-requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export function rejectAdminOrgRequest(id: string, reason: string) {
  return apiFetch<{ id: string; status: string }>(
    `/api/v1/admin/org-requests/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}

export function listAdminOrganizations() {
  return apiFetch<PlatformListResponse<PlatformOrganizationSummary>>(
    "/api/v1/admin/organizations",
  );
}

export function getAdminOrganization(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    visitCount: number;
    branchCount: number;
    userCount: number;
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      lastLoginAt: string | null;
      joinedAt: string;
    }>;
    recentActivity: Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceId: string;
      createdAt: string;
      actor: { id: string; email: string; name: string | null } | null;
      metadata: unknown;
    }>;
  }>(`/api/v1/admin/organizations/${id}`);
}

export function suspendAdminOrganization(id: string) {
  return apiFetch<{ id: string; status: string }>(
    `/api/v1/admin/organizations/${id}/suspend`,
    { method: "POST" },
  );
}

export function reactivateAdminOrganization(id: string) {
  return apiFetch<{ id: string; status: string }>(
    `/api/v1/admin/organizations/${id}/reactivate`,
    { method: "POST" },
  );
}

export function submitOrganizationRequest(input: {
  organizationName: string;
  organizationEmail: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  requestedPlan?: string;
}) {
  return apiFetch<{ success: true }>("/api/public/org-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
