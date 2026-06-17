import { RequestAccessWizard } from "@/components/request-access/request-access-wizard";
import { AuthGlassCard, AuthPageHeader } from "@/components/auth/auth-shell";

export default function RequestAccessPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Request organization access"
        subtitle="Get your company onboarded in a few quick steps"
        showLogo
      />
      <AuthGlassCard className="p-0">
        <RequestAccessWizard />
      </AuthGlassCard>
    </div>
  );
}
