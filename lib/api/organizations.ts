import { apiFetch } from "./client";

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
}

export interface CreateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  organizationId: string;
  organizationStatus: "PENDING";
  memberId: string;
  roleId: string;
  message: string;
}

export function createOrganization(input: CreateOrganizationInput) {
  return apiFetch<CreateOrganizationResponse>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
