import { apiFetch } from "@/lib/api/client";

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiFetch<{ success: true }>("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export interface PasswordResetPreview {
  email: string;
  expiresAt: string;
}

export function getPasswordResetPreview(token: string) {
  return apiFetch<PasswordResetPreview>(
    `/api/v1/auth/reset-password/preview?token=${encodeURIComponent(token)}`,
  );
}

export function resetPassword(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiFetch<{ email: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
