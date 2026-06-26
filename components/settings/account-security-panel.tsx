"use client";

import { useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { useActionFeedback } from "@/components/providers/action-feedback-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { changePassword } from "@/lib/api/password";

export function AccountSecurityPanel() {
  const { showSuccess, showError } = useActionFeedback();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match");
      return;
    }

    if (newPassword === currentPassword) {
      setFormError("New password must be different from your current password");
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password changed successfully.");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to change password. Please try again.";
      setFormError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account security</CardTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Update your password. You will stay signed in on this device.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="max-w-md space-y-4">
          <PasswordField
            id="currentPassword"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            disabled={submitting}
            required
          />
          <PasswordField
            id="newPassword"
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            disabled={submitting}
            required
            showStrength
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            disabled={submitting}
            required
          />

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <Button type="submit" loading={submitting} disabled={submitting}>
            {submitting ? "Changing password…" : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
