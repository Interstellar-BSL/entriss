import type { PaginatedResult } from "@/lib/api/client";
import { serverApiFetch } from "@/lib/api/server-client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import type { ListVisitsParams } from "@/lib/api/visits";
import { detachVisits } from "@/lib/visits/detach";

export async function listVisitsServer(params?: ListVisitsParams) {
  const data = await serverApiFetch<PaginatedResult<VisitWithRelations>>(
    "/api/v1/visits",
    {
      searchParams: params,
    },
  );

  return {
    ...data,
    items: detachVisits(data.items),
  };
}
