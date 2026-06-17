import { apiFetch } from "@/lib/api/client";
import type { HostDirectoryEntry } from "@/lib/hosts/types";
import {
  getHostDepartment,
  getHostDepartmentsForOrg,
} from "@/lib/hosts/host-department-store";

function enrichWithDepartment(
  organizationId: string,
  hosts: HostDirectoryEntry[],
): HostDirectoryEntry[] {
  const departments = getHostDepartmentsForOrg(organizationId);
  return hosts.map((host) => ({
    ...host,
    department: departments[host.id] ?? host.department,
  }));
}

export type { HostDirectoryEntry };

export async function listActiveHosts(organizationId?: string) {
  const result = await apiFetch<{ items: HostDirectoryEntry[] }>(
    "/api/v1/organizations/hosts",
  );

  if (!organizationId) {
    return result.items;
  }

  return enrichWithDepartment(organizationId, result.items);
}

export async function getHostById(hostMemberId: string, organizationId?: string) {
  const result = await apiFetch<{ host: HostDirectoryEntry | null }>(
    `/api/v1/organizations/hosts/${encodeURIComponent(hostMemberId)}`,
  );

  if (!result.host) {
    return null;
  }

  if (!organizationId) {
    return result.host;
  }

  return {
    ...result.host,
    department: getHostDepartment(organizationId, result.host.id),
  };
}

export async function searchHosts(query: string, organizationId?: string) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const result = await apiFetch<{ items: HostDirectoryEntry[] }>(
    `/api/v1/organizations/hosts${suffix}`,
  );

  if (!organizationId) {
    return result.items;
  }

  return enrichWithDepartment(organizationId, result.items);
}

export function createHost(input: { email: string; name: string }) {
  return apiFetch<{
    id: string;
    userId: string;
    email: string;
    name: string;
    role: { id: string; name: string; slug: string };
    temporaryPassword: string;
  }>("/api/v1/organizations/hosts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
