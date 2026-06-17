export {
  BranchNotFoundError,
  ExpiredQRTokenError,
  HostNotFoundError,
  InvalidQRTokenError,
  InvalidVisitTransitionError,
  ServiceError,
  VisitCheckInError,
  VisitCheckOutError,
  VisitNotFoundError,
  VisitorIdentityConflictError,
  VisitorNotFoundError,
  VisitorNoteNotFoundError,
} from "./errors";

export {
  canTransitionVisitStatus,
  isTerminalVisitStatus,
  resolveInitialVisitStatus,
} from "./visit-transitions";

export {
  ensureVisitQR,
  generateVisitQR,
  resolveQrExpiration,
  verifyVisitQR,
} from "./qr.service";
export type {
  GenerateVisitQRResult,
  VerifyVisitQRResult,
  VisitQRPayload,
} from "./qr.service";

export {
  generateA4BadgeLayout,
  generateBadgeData,
} from "./badge.service";
export type { A4BadgeLayout, ThermalBadgeData } from "./badge.service";

export {
  getVisitorTimeline,
} from "./visitor-timeline.service";
export type {
  VisitorTimelineEntry,
  VisitorTimelineMetrics,
  VisitorTimelineResult,
  VisitorTimelineVisitor,
} from "./visitor-timeline.service";

export {
  getVisitorInsights,
} from "./visitor-insights.service";
export type {
  VisitorInsightsData,
  VisitorInsightsFavoriteBranch,
  VisitorInsightsFavoriteHost,
  VisitorInsightsMostRecentBranch,
  VisitorInsightsMostRecentHost,
  VisitorInsightsResult,
  VisitorType,
  VisitFrequency,
} from "./visitor-insights.service";

export {
  createVisitorNote,
  deleteVisitorNote,
  listVisitorNotes,
  updateVisitorNote,
} from "./visitor-notes.service";
export type { VisitorNoteRecord } from "./visitor-notes.service";

export {
  getVisitorTags,
  updateVisitorTags,
} from "./visitor-tags.service";
export type { VisitorTagsResult } from "./visitor-tags.service";

export {
  getActivityStream,
} from "./activity-stream.service";
export type {
  ActivityItem,
  ActivityStreamFilters,
  ActivityStreamResult,
} from "./activity-stream.service";

export {
  searchUnified,
} from "./unified-search.service";
export type {
  UnifiedSearchCheckedInResult,
  UnifiedSearchResult,
  UnifiedSearchVisitResult,
  UnifiedSearchVisitorResult,
} from "./unified-search.service";

export {
  createVisitor,
  createVisitorForStaff,
  findExistingVisitorByIdentity,
  findVisitor,
  /** @deprecated Legacy only — use visit-engine */
  getOrCreateVisitor,
  getVisitorById,
  getVisitorVisitSummary,
  listVisitors,
  resolveVisitorIdentity,
} from "./visitor.service";
export type { VisitorVisitSummary } from "./visitor.service";

export {
  createBranch,
  getBranchById,
  listBranches,
  updateBranch,
} from "./branch.service";
export type { BranchSummary } from "./branch.service";

export {
  ensureBranchSettings,
  ensureOrganizationSettings,
  getBranchSettings,
  getFeatureFlag,
  getOrganizationSettings,
  initializeBranchSettings,
  initializeOrganizationSettings,
  isFeatureEnabled,
  setFeatureFlag,
  updateBranchSettings,
  updateOrganizationSettings,
} from "./settings.service";

export {
  approveVisit,
  cancelVisit,
  checkInVisit,
  checkInWithQR,
  checkInWithVisitId,
  checkOutVisit,
  checkOutWithQR,
  checkOutWithVisitId,
  createVisit,
  findVisitByVisitorDetails,
  getVisitById,
  listVisitsByOrganization,
  /** @deprecated Use registerWalkInVisit from visit-engine */
  registerVisitorVisit,
  rejectVisit,
  resolveVisitFromQrScan,
  updateVisitStatus,
  validateVisitForCheckIn,
  validateVisitForCheckOut,
} from "./visit.service";
