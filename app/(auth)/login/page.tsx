import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { PlatformLogo } from "@/components/branding/platform-logo";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PlatformLogo size="md" className="mb-4 justify-center" />
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Sign in to Entriss
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Visitor management for your organization
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
