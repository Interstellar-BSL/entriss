import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingState } from "@/components/shared/loading-state";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <AuthPageHeader
        title="Sign in to Entriss"
        subtitle="Visitor management for your organization"
      />

      <AuthGlassCard>
        <Suspense fallback={<LoadingState label="Loading sign in…" />}>
          <LoginForm />
        </Suspense>
      </AuthGlassCard>
    </div>
  );
}
