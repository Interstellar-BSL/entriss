import { AdminOrganizationDetail } from "@/components/admin/admin-organization-detail";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOrganizationDetail organizationId={id} />;
}
