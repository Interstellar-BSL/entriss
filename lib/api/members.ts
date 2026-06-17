import { apiFetch } from "@/lib/api/client";
import type { OrganizationMemberSummary } from "@/lib/api/invites";

export interface OrganizationRoleSummary {
  id: string;
  name: string;
  slug: string;
}

export function listOrganizationRoles() {
  return apiFetch<{ items: OrganizationRoleSummary[] }>(
    "/api/v1/organizations/roles",
  );
}

export function createMember(input: {
  email: string;
  name: string;
  roleId: string;
}) {
  return apiFetch<{
    id: string;
    userId: string;
    email: string;
    name: string;
    role: OrganizationRoleSummary;
    temporaryPassword: string;
  }>("/api/v1/organizations/members", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMember(
  memberId: string,
  input: { name?: string; roleId?: string },
) {
  return apiFetch<{ id: string; updated: boolean }>(
    `/api/v1/organizations/members/${memberId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function disableMember(memberId: string) {
  return apiFetch<{ id: string; disabled: boolean }>(
    `/api/v1/organizations/members/${memberId}/disable`,
    { method: "POST" },
  );
}

export type { OrganizationMemberSummary };
