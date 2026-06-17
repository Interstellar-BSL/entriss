import { apiFetch } from "@/lib/api/client";

export interface PasswordSetupPreview {
  email: string;
  organization: { id: string; name: string; slug: string };
  expiresAt: string;
}

export function getPasswordSetupPreview(token: string) {
  return apiFetch<PasswordSetupPreview>(
    `/api/v1/auth/setup-password/preview?token=${encodeURIComponent(token)}`,
  );
}

export function setupPassword(input: { token: string; password: string }) {
  return apiFetch<{
    userId: string;
    email: string;
    organizationId: string;
    organization: { id: string; name: string; slug: string };
    organizationStatus: string;
  }>("/api/v1/auth/setup-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
