import { PlatformLogo } from "@/components/branding/platform-logo";
import { cn } from "@/lib/utils/cn";

export function AuthGlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)]/80 bg-[var(--card)]/85 p-6 shadow-lg shadow-[var(--foreground)]/5 backdrop-blur-md motion-safe:animate-alive-fade-in",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AuthPageHeader({
  title,
  subtitle,
  orgHint,
  showLogo = true,
}: {
  title: string;
  subtitle?: string;
  orgHint?: string | null;
  showLogo?: boolean;
}) {
  return (
    <div className="auth-page-header mb-6 flex flex-col items-center text-center motion-safe:animate-alive-slide-up">
      {showLogo ? <PlatformLogo size="md" className="auth-page-brand mb-4 justify-center" /> : null}
      <h1 className="auth-page-title text-xl font-semibold tracking-tight">
        {title}
      </h1>
      {orgHint ? (
        <p className="auth-page-org-hint mt-1 text-xs font-medium">{orgHint}</p>
      ) : null}
      {subtitle ? (
        <p className="auth-page-subtitle mt-1 text-sm">{subtitle}</p>
      ) : null}
    </div>
  );
}
