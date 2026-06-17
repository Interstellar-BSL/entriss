import { VisitStatus } from "@prisma/client";

export function isNoShowVisit(visit: {
  status: VisitStatus | string;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
}): boolean {
  if (visit.checkedInAt || !visit.scheduledAt) {
    return false;
  }

  if (visit.scheduledAt.getTime() > Date.now()) {
    return false;
  }

  return (
    visit.status === VisitStatus.APPROVED ||
    visit.status === VisitStatus.PENDING
  );
}
