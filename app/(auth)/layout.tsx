import { AuthBackground } from "@/components/auth/auth-background";
import { AUTH_PAGE_ROOT_ID } from "@/lib/auth/auth-background-image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id={AUTH_PAGE_ROOT_ID}
      className="relative min-h-screen overflow-hidden"
      data-auth-image="fallback"
    >
      <AuthBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}
