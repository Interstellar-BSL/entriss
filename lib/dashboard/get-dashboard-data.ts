import { VisitStatus } from "@prisma/client";
import { listVisitsServer } from "@/lib/api/visits.server";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export interface DashboardData {
  pendingVisitsCount: number;
  approvedVisitsCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  rejectedVisitsCount: number;
  recentVisits: VisitWithRelations[];
  checkedInVisits: VisitWithRelations[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    pendingVisits,
    approvedVisits,
    checkedInVisits,
    checkedOutVisits,
    rejectedVisits,
    recentVisits,
    checkedInList,
  ] = await Promise.all([
    listVisitsServer({ status: VisitStatus.PENDING, limit: 1 }),
    listVisitsServer({ status: VisitStatus.APPROVED, limit: 1 }),
    listVisitsServer({ status: VisitStatus.CHECKED_IN, limit: 1 }),
    listVisitsServer({ status: VisitStatus.CHECKED_OUT, limit: 1 }),
    listVisitsServer({ status: VisitStatus.REJECTED, limit: 1 }),
    listVisitsServer({ limit: 10 }),
    listVisitsServer({ status: VisitStatus.CHECKED_IN, limit: 8 }),
  ]);

  return {
    pendingVisitsCount: pendingVisits.pagination.total,
    approvedVisitsCount: approvedVisits.pagination.total,
    checkedInCount: checkedInVisits.pagination.total,
    checkedOutCount: checkedOutVisits.pagination.total,
    rejectedVisitsCount: rejectedVisits.pagination.total,
    recentVisits: recentVisits.items,
    checkedInVisits: checkedInList.items,
  };
}
