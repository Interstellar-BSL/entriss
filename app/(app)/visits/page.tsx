import { Suspense } from "react";

import { VisitsPage } from "@/components/visits/visits-page";
import { TableSkeleton } from "@/components/shared/loading-state";

export default function VisitsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <TableSkeleton />
        </div>
      }
    >
      <VisitsPage />
    </Suspense>
  );
}
