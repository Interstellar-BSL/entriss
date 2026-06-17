import type { PaginatedResult } from "@/lib/api/client";
import { serverApiFetch } from "@/lib/api/server-client";
import type { ListVisitorsParams, VisitorRecord } from "@/lib/api/visitors";
import { detachVisitorRecords } from "@/lib/visits/detach";

export async function listVisitorsServer(params?: ListVisitorsParams) {
  const data = await serverApiFetch<PaginatedResult<VisitorRecord>>(
    "/api/v1/visitors",
    {
      searchParams: params,
    },
  );

  return {
    ...data,
    items: detachVisitorRecords(data.items),
  };
}
