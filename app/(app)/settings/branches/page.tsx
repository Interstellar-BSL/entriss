import { BranchSettingsIndex } from "@/components/settings/branch-settings-index";

export default function BranchSettingsListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Branch settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Operational policies per location
        </p>
      </div>
      <BranchSettingsIndex />
    </div>
  );
}
