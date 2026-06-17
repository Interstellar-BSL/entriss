import { RequestAccessWizard } from "@/components/request-access/request-access-wizard";

export default function RequestAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4 py-10">
      <div className="w-full max-w-md">
        <RequestAccessWizard />
      </div>
    </div>
  );
}
