import { apiFetch } from "@/lib/api/client";
import type {
  CreateBranchInput,
  UpdateBranchInput,
} from "@/lib/validations/branch";

export interface BranchSummary {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  code: string | null;
  description: string | null;
  timezone: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ListBranchesResponse {
  items: BranchSummary[];
}

export interface GetBranchResponse {
  branch: BranchSummary;
}

export interface CreateBranchResponse {
  branch: BranchSummary;
}

export function listBranches() {
  return apiFetch<ListBranchesResponse>("/api/v1/branches");
}

export function getBranch(branchId: string) {
  return apiFetch<GetBranchResponse>(`/api/v1/branches/${branchId}`);
}

export function createBranch(input: CreateBranchInput) {
  return apiFetch<CreateBranchResponse>("/api/v1/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBranch(branchId: string, input: UpdateBranchInput) {
  return apiFetch<CreateBranchResponse>(`/api/v1/branches/${branchId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
