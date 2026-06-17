import { apiFetch } from "@/lib/api/client";

export interface OrganizationMemberSummary {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: { id: string; name: string; slug: string };
  status: string;
  isActive: boolean;
  joinedAt: string;
}

export interface OrganizationInviteSummary {
  id: string;
  email: string;
  role: { name: string; slug: string };
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { name: string; email: string };
}

export interface InvitePreview {
  email: string;
  organization: { id: string; name: string; slug: string };
  role: { name: string; slug: string };
  invitedBy: { name: string; email: string };
  expiresAt: string;
}

export function listMembers() {
  return apiFetch<{ items: OrganizationMemberSummary[] }>(
    "/api/v1/organizations/members",
  );
}

export function listInvites(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ items: OrganizationInviteSummary[] }>(
    `/api/v1/invites${query}`,
  );
}

export function createInvite(input: { email: string; roleSlug: string }) {
  return apiFetch<{
    invite: { id: string; email: string; role: { name: string; slug: string }; expiresAt: string };
  }>("/api/v1/invites", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resendInvite(inviteId: string) {
  return apiFetch<{ id: string; email: string; expiresAt: string; resent: boolean }>(
    `/api/v1/invites/resend/${inviteId}`,
    { method: "POST" },
  );
}

export function revokeInvite(inviteId: string) {
  return apiFetch<{ id: string; revoked: boolean }>(
    `/api/v1/invites/revoke/${inviteId}`,
    { method: "POST" },
  );
}

export function getInviteByToken(token: string) {
  return apiFetch<{ invite: InvitePreview }>(`/api/v1/invites/${token}`);
}

export function acceptInvite(input: {
  token: string;
  name?: string;
  password?: string;
}) {
  return apiFetch<{
    organizationId: string;
    organization: { id: string; name: string; slug: string };
    role: { name: string; slug: string };
    memberId: string | null;
    roleId: string | null;
    organizationStatus: string | null;
    userId?: string;
    email?: string;
    message: string;
  }>("/api/v1/invites/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Legacy paths — kept for backward compatibility
export function acceptInviteByPath(token: string) {
  return apiFetch<{
    organizationId: string;
    organization: { id: string; name: string; slug: string };
    role: { name: string; slug: string };
    memberId: string | null;
    roleId: string | null;
    organizationStatus: string | null;
    message: string;
  }>(`/api/v1/invites/${token}/accept`, { method: "POST" });
}
