import { BranchOperationalSettings } from "@/components/settings/branch-operational-settings";

export default async function BranchOperationalSettingsRoute({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  return <BranchOperationalSettings branchId={branchId} />;
}
