# Entriss — State Snapshot

**Last updated:** 2026-06-18  
**Checkpoint:** **PHASE 6 COMPLETE — NOTIFICATIONS & WORKFLOW COMPLETION**

**Purpose:** Ground-truth snapshot from **code audit** (not product docs). Use this as the canonical state after **Phase 6 — Notifications & Workflow Completion**, building on **Phase 5 — Reporting & Analytics** (Phases 5.1–5.6B), **Phase 3 — Operator & Reception Tooling** (Phases 3.1–3.6), and **Phase 2 — Visitor Lifecycle Completeness** (Phases 2.1–2.5B). Historical sections below (Phase 8–10.1) are retained for reference; where they conflict with this checkpoint, **this section wins**.

**Critical conclusion:**

> ENTIRSS now has a **unified event-driven notification layer** — in-app bell, notification center, arrival/approval/status projections, and future-ready channel stubs — as a non-invasive side-effect on top of existing visit, approval, and audit flows. Remaining work is media infrastructure and enterprise polish (Phases 4, 7–8). External email/SMS delivery is stubbed only.

---

## PHASE 1 COMPLETION SNAPSHOT

**Version:** Post-Resilience Hardening  
**Status:** COMPLETE

### Phase 1.1 — Server Policy Authority

**Completed:**

- Server-side enforcement of: `requireVisitorPhoto`, `requireVisitorDocuments`, visit hours, `kioskEnabled`
- Unified policy gate: `enforceVisitCheckInPolicy()`
- All check-in paths routed through same policy engine (Kiosk QR, Booking, Reception QR/Manual, Walk-in Registration)
- Policy errors standardized: `PHOTO_REQUIRED`, `DOCUMENTS_REQUIRED`, `OUTSIDE_VISIT_HOURS`, `KIOSK_DISABLED`

**Result:** Client is no longer authoritative. Server is source of truth.

---

### Phase 1.2 — QR Trust Unification

**Completed:** `verifyVisitQR()`, HMAC/expiry/tenant/revocation validation, QR Gateway (`POST /api/v1/visits/qr/resolve`)

**Removed:** `visitId` trust model on scan surfaces; client-side QR acceptance without server verify

**Result:** Only cryptographically valid QR tokens are accepted.

---

### Phase 1.3 — API Contract Standardization

**Completed:** Unified `VisitState` (`APPROVED`, `PENDING`, `APPROVAL_REQUIRED`, `CHECKED_IN`); envelope `{ success, state, data | error }`

**Result:** Clients trust `state`. No state inference from HTTP status alone.

---

### Phase 1.4 — Dead-State Elimination (Kiosk)

**Completed:** `PENDING` → `approval-wait`; approval polling; resolve timeout (12s); scan-ignore/debounce/resolving visibility

**Result:** No known kiosk dead-end states remain.

---

### Phase 1.5A — State Parity (Reception)

**Completed:** Reception QR + Manual — `approval-wait`, `approval-pending`, polling, scan-ignore hints. Removed toast/approval dead-ends and silent processing drops.

**Result:** Reception follows kiosk state model.

---

### Phase 1.5B — Recovery Parity

**Completed:** `RetryState`; `resolveQrWithRetry()` (3×, 750ms, 12s); recovery panels; camera recovery UX; poll failure warnings; capture validation; operational snapshot warnings.

**Result:** Recovery behavior standardized across kiosk and reception.

---

## PHASE 2 COMPLETION SNAPSHOT

**Version:** Visitor Lifecycle Completeness  
**Status:** COMPLETE  
**Date:** June 2026

**Objective:** Transform visitors from simple visit-linked records into first-class entities with persistent identity, intelligence, operational history, and organizational memory.

### Phase 2.1 — Visitor Timeline

**Status:** COMPLETE

**Implemented:**

- Visitor visit history API (`GET /api/v1/visitors/[id]/timeline`)
- `getVisitorTimeline()` service
- Chronological activity timeline (newest first)
- Check-in / check-out history
- Visit duration calculation (`checkedOutAt - checkedInAt`)
- Average duration metrics (completed visits only)
- First visit / last visit tracking
- No-show calculation (past `scheduledAt`, no check-in, `APPROVED`/`PENDING`)
- Current visit status indicators

**UI:** `VisitorTimelinePanel`, timeline cards, visit metrics summary

---

### Phase 2.2 — Audit Trail Consolidation (Read Model)

**Status:** COMPLETE

**Implemented:** Unified Activity Stream read model merging `VisitEvent` + `AuditLog` (no schema merge).

**Capabilities:**

- Single activity stream (`GET /api/v1/activity`)
- Tenant-scoped queries; filters: `visitorId`, `visitId`, `actorId`, `category`, `branchId`, `from`, `to`, `limit`
- Category mapping: Visit, Approval, Identity, Security, Settings, System

**UI:** `ActivityViewer`; Visitor Activity tab; Visit Activity tab

**Result:** Staff no longer need multiple audit screens to understand visitor history.

---

### Phase 2.3 — Repeat Visitor Intelligence (Read Model)

**Status:** COMPLETE

**Implemented:** `getVisitorInsights()` — dynamic analytics from existing `Visitor` + `Visit` records (no cached tables).

**Metrics:** Visit count, completed/cancelled/no-show counts, first/last visit, days since last visit, average duration, favorite branch/host, most recent branch/host

**Classification:** `FIRST_TIME`, `RETURNING`, `FREQUENT`, `VIP`, `DORMANT` (180+ days overrides)

**Frequency:** `LOW`, `MEDIUM`, `HIGH` (visits in last 12 months)

**UI:** `VisitorInsightsPanel`, visitor type badges, frequency indicators

---

### Phase 2.4 — Visitor Notes & Tags

**Status:** COMPLETE

**Schema:** `VisitorNote` table; `Visitor.visitorTags String[]` (enum values: `VIP`, `WATCHLIST`, `REQUIRES_ESCORT`, `CONTRACTOR`, `FREQUENT_VISITOR`)

**Capabilities:**

- CRUD visitor notes (`/api/v1/visitors/[id]/notes`)
- Tag read/replace (`GET`/`PUT /api/v1/visitors/[id]/tags`)
- Audit: `NOTE_CREATED`, `NOTE_UPDATED`, `NOTE_DELETED`, `VISITOR_TAGS_UPDATED`
- Activity stream integration for note/tag audit events

**UI:** `VisitorNotesPanel`, `VisitorTagsPanel`, `VisitorTagBadges` (VIP gold, WATCHLIST red)

**Foundation for (future):** Watchlists, escort requirements, blacklist workflows — **not enforced in Phase 2**

---

### Phase 2.5 — Visitor 360 Profile

**Status:** COMPLETE

**Implemented:** Unified Visitor Workspace in `VisitorProfileDrawer`.

**Sections:** Overview | Identity | Timeline | Activity | Insights | Notes

| Section | Content |
|---------|---------|
| **Overview** | Photo, identity, status, tags, visitor type, visit summary cards |
| **Identity** | Contact info, profile photo, documents (from activity media) |
| **Timeline** | `VisitorTimelinePanel` (embedded) |
| **Activity** | `ActivityViewer` filtered by `visitorId` |
| **Insights** | `VisitorInsightsPanel` (cached from overview when available) |
| **Notes** | `VisitorTagsPanel` + `VisitorNotesPanel` |

**Performance:** Lazy-loaded tabs (Timeline, Activity, Insights); overview loads immediately; deferred document loading on Identity tab

---

### Phase 2.5B — Stabilization

**Status:** COMPLETE

**Resolved:**

- Visitor Tags runtime failures (stale Prisma client + controlled-tags panel bug)
- Visitor Notes runtime failures (stale `visitorNote` delegate)
- Prisma client drift in dev (`globalThis` cache)
- Generic `INTERNAL_ERROR` masking for `PrismaClientValidationError`

**Improvements:**

- Prisma client auto-refresh when generated client `mtime` changes (dev)
- `PRISMA_CLIENT_OUT_OF_DATE` / `SCHEMA_OUT_OF_DATE` API error codes
- Null-safe tag normalization; notes ISO date serialization
- Independent panel loading on Notes tab; `Promise.allSettled` on overview

**Validation:** `npx prisma generate` PASS · `npx tsc --noEmit` PASS

---

### Visitor lifecycle capabilities now available

Staff can:

- View complete visitor history and consolidated activity
- Understand visitor behavior patterns (insights, frequency, type)
- Track repeat/VIP/dormant visitors; favorite hosts/branches
- Maintain operational notes and tags
- Access all visitor context from a single Visitor 360 drawer

### Phase 2 future enhancements (not in scope)

- Blacklist enforcement, watchlist alerts, visitor risk/reputation scoring
- Automated VIP recognition, relationship graph
- Document verification / expiry tracking, behavioral analytics

---

## PHASE 3 COMPLETION SNAPSHOT

**Version:** Operator & Reception Tooling  
**Status:** COMPLETE  
**Date:** June 2026

**Objective:** Transform Reception from a simple visitor lookup screen into a complete operational control center for daily reception operations, search, QR-assisted check-ins, failed kiosk recovery, duplicate detection, visitor intelligence, manual intervention, and operational auditing.

### Phase 3.1 — Unified Operator Search

**Status:** COMPLETE

**Implemented:**

- `lib/services/unified-search.service.ts` — parallel tenant-scoped queries with deduplication, priority ranking, result limits
- `GET /api/v1/search/unified` — `lib/api/search.ts`, `components/search/unified-search-panel.tsx`
- Search by: name, email, phone, visitor ID, visit ID, QR reference, company, tags, notes, host, branch
- Results grouped: **Visitors**, **Visits**, **Currently checked-in**
- Quick actions from results: Open Visitor 360, Open Visit Details, Check In, Check Out, Print Badge

---

### Phase 3.2 — Visitor Rescue Flows & Command Center

**Status:** COMPLETE

**Implemented:**

- `lib/services/reception-dashboard.service.ts` — `getReceptionDashboard()`, `getFailedKioskSessions()`
- `GET /api/v1/reception/dashboard` — `lib/api/reception.ts`
- `components/reception/reception-command-center.tsx` — metrics, operational queues, recent visitors
- `components/reception/visitor-rescue-panel.tsx` — failed kiosk sessions + abandoned registrations
- `components/reception/reception-visit-quick-actions.tsx` — shared visit action buttons

**Command center metrics:** today's arrivals, checked-in now, pending approvals, expected visitors (2 hr), overdue visitors, walk-ins awaiting action, manual overrides today

**Operational queues:** pending approvals, expected arrivals, checked-in visitors, overdue visitors

**Rescue flows:** resume kiosk (identity / capture / review / approval-wait), complete at reception, cancel session; resume / complete / cancel abandoned walk-in registrations

---

### Phase 3.3 — Manual Overrides

**Status:** COMPLETE

**Implemented:**

- Permissions: `visit:force_checkin`, `visit:force_checkout` — granted to **Admin** and **Security** only (not Receptionist)
- Migration: `checkedInById`, `checkedOutById` on `Visit`
- `lib/services/visit-override.service.ts` — `forceVisitCheckIn`, `forceVisitCheckOut`, `countManualOverridesToday`
- `POST /api/v1/visits/[visitId]/force-check-in`, `force-check-out`
- `components/reception/visit-override-modal.tsx` — reason + confirmation
- Audit: `FORCE_CHECKIN`, `FORCE_CHECKOUT`; visit events `visit.force_check_in`, `visit.force_check_out`
- Activity stream (Security category), visitor timeline override badges, dashboard override counts

---

### Phase 3.4 — Duplicate Detection Visibility

**Status:** COMPLETE (visibility only — no merge/delete/auto-link)

**Implemented:**

- `lib/services/visitor-duplicate.service.ts` — `getPossibleDuplicates()`, `markDuplicateGroupReviewed()`
- `GET /api/v1/visitors/duplicates`, `POST /api/v1/visitors/duplicates/review`
- `lib/api/duplicates.ts`, `components/visitors/duplicate-review-panel.tsx`
- Detection rules: **HIGH** — same email or phone; **MEDIUM** — same name + company; **LOW** — same full name within 30 days
- Review: side-by-side comparison, Open Visitor 360, **Mark reviewed** (`DUPLICATE_REVIEWED` audit log; session-only dismissal)

**Not implemented (by design):** merge, delete, auto-link, background jobs, schema changes for review persistence

---

### Phase 3.5 — Reception Productivity Tools

**Status:** COMPLETE

**Implemented:**

- `lib/services/recent-visitors.service.ts` — `getRecentVisitors()` (20 most recently active)
- `GET /api/v1/reception/recent-visitors` — `lib/api/reception-recent.ts`
- `components/reception/recent-visitors-panel.tsx` — recent visitors with visit count, type badge, quick actions
- `lib/services/visitor-last-visit.service.ts` — `getLastVisit()`
- `GET /api/v1/visitors/[id]/last-visit`
- Visitor 360 overview: **Last Visit** + **Visit Summary** cards (from existing insights — no duplicate queries)

---

### Phase 3.6 — Reception Information Architecture & UX Refactor

**Status:** COMPLETE

**Implemented:**

- Four primary workspaces via `components/reception/reception-workspace-nav.tsx`:
  1. **Command Center** (default) — metrics, queues, recent visitors, fast actions
  2. **Search** — unified search only (no dashboard/rescue/duplicates)
  3. **Operations** — rescue queue, duplicate review, override guidance (`reception-operations-workspace.tsx`)
  4. **Activity** — live activity stream + on-site list (`live-activity-panel.tsx`)
- **QR Scan** — on-demand drawer (`qr-scanner-drawer.tsx`); permanent side panel removed
- **Action bar** (`reception-action-bar.tsx`) — Scan QR, New walk-in, Search, Pending approvals, Print badge (permission-aware)
- **Visitor 360** — contextual drawer from search, command center, operations, rescue, duplicates (not a primary nav tab)
- Full-width workspace layout — more screen space for operational work

**IA note:** Today's arrivals **list** is reachable via **Search** (today preset); today's arrivals **metric** remains on Command Center.

---

### Phase 3 architecture achievements

| Before Phase 3 | After Phase 3 |
|----------------|---------------|
| Search-centric, reactive | Operational dashboard + dedicated workspaces |
| Limited operational visibility | Metrics, queues, rescue, duplicates, overrides |
| Permanent QR panel | On-demand QR drawer |
| Fragmented lookup | Unified operator search |

**Data sources consumed through Reception:** Visitors, Visits, Visit Events, Audit Logs, Approvals, Visitor Notes, Visitor Tags, Visitor Intelligence, Visitor Timeline, Activity stream.

### Phase 3 status matrix

| Area | Status |
|------|--------|
| Unified Search (3.1) | ✅ Complete |
| Command Center (3.2) | ✅ Complete |
| Visitor Rescue Flows (3.2) | ✅ Complete |
| Manual Overrides (3.3) | ✅ Complete |
| Duplicate Visibility (3.4) | ✅ Complete |
| Productivity Tools (3.5) | ✅ Complete |
| Reception IA Refactor (3.6) | ✅ Complete |
| Visitor 360 Integration | ✅ Complete |
| Activity Integration | ✅ Complete |
| Permission Controls | ✅ Complete |

**Overall Phase 3 readiness:** COMPLETE

---

## PHASE 5 COMPLETION SNAPSHOT

**Version:** Reporting & Analytics (Read-Only Intelligence Layer)  
**Status:** COMPLETE + STABLE + PRODUCTION READY (FROZEN)  
**Date:** June 2026

**Objective:** Provide management visibility over existing operational data through read → aggregate → visualize → export. No new workflows, state machines, permissions, or visit lifecycle changes.

### Core design principle

Phase 5 is strictly:

```
READ → AGGREGATE → VISUALIZE → EXPORT
```

It does **not** modify visits, approvals, QR flows, reception workflows, or permissions. It does **not** duplicate Reception Command Center, unified search, activity stream, or Visitor 360 operational features.

### Phase 5.1 — Dashboard Analytics

**Status:** COMPLETE

**Service:** `getAnalyticsDashboard()` → `queryAnalytics({ type: "dashboard" })`

**Metrics (derived from `Visit`):**

| Metric | Rule |
|--------|------|
| Daily visits | `createdAt` ∈ today |
| Weekly visits | current ISO week |
| Monthly visits | current calendar month |
| In-range totals | selected period |
| Status breakdown | checked-in, completed, cancelled, no-shows, pending, approved, rejected |
| Trend series | daily buckets over selected range |

**UI:** `AnalyticsDashboard` — KPI cards, visits-over-time trend (`AnalyticsTrendChart`), status distribution (`AnalyticsBarChart`)

**API:** `GET /api/v1/analytics/dashboard`

---

### Phase 5.2 — Branch Analytics

**Status:** COMPLETE

**Service:** `getBranchAnalytics()` → `queryAnalytics({ type: "branch" })`

**Metrics:** traffic per branch, check-ins, completion rate, first-time vs returning visitors, hourly heatmap (0–23), 30-day trend lines, peak days per branch

**Data rule:** `Visit.branchId`; visitor classification reuses existing insights rules (unique visitors per branch in range)

**UI:** `BranchAnalyticsPanel` — bar chart, hour × branch heatmap, trend line

**API:** `GET /api/v1/analytics/branches`

---

### Phase 5.3 — Host Analytics

**Status:** COMPLETE

**Service:** `getHostAnalytics()` → `queryAnalytics({ type: "host" })`

**Metrics:** host ranking by visit count, total/completed/pending/checked-in volumes, average duration (CHECKED_OUT visits with both timestamps only)

**Data rule:** `Visit.hostMemberId`; no new host entities

**UI:** `HostAnalyticsPanel` — leaderboard, optional host drilldown (`hostId` filter)

**API:** `GET /api/v1/analytics/hosts`

---

### Phase 5.4 — Export System

**Status:** COMPLETE

**Service:** `getAnalyticsExportPayload()` — single batched parallel fetch (dashboard + branches + hosts + audit + visit rows)

**Formats:**

| Format | Implementation |
|--------|----------------|
| CSV | Flat tables — visits, branch summary, host summary (`export-utils.ts`) |
| Excel | Multi-sheet workbook via dynamic `xlsx` import |
| PDF | Browser print flow from generated HTML (blob URL + `print()`) |

**UI:** `ExportCenter` — format selector, date range, branch filter, download

**API:** `GET /api/v1/analytics/export`

**Pipeline:** one API call → full payload → client-side format generation (no per-row server queries)

---

### Phase 5.5 — Audit Reporting

**Status:** COMPLETE

**Service:** `getAuditAnalytics()` → `queryAnalytics({ type: "audit" })`

**Metrics:**

- Visits by status
- Missing check-outs (checked-in before today, still CHECKED_IN)
- Approval delays (PENDING beyond 2h threshold)
- Security overrides (`FORCE_CHECKIN`, `FORCE_CHECKOUT` from `AuditLog`)
- Suspicious patterns (multiple visits same visitor/day)
- Activity table (reuses `getActivityStream()` — Phase 2.2; no duplication)

**UI:** `AuditReportsPanel` — compliance + security tables, category filter, export via Export Center

**API:** `GET /api/v1/analytics/audit`

---

### Phase 5.6A — Query Layer Refactor & Cache Hardening

**Status:** COMPLETE (non-breaking internal upgrade)

**Architecture:**

```
API → queryAnalytics() → [cache] → [snapshot reader] → live aggregation
                              ↓
                    shared calculators + breakdown builders
```

**Query layer (`lib/analytics/query/`):**

| Module | Role |
|--------|------|
| `analytics-query.service.ts` | Unified entry `queryAnalytics({ type, filters, ctx })` |
| `analytics-live-query.ts` | Live aggregation handlers (dashboard, branch, host, audit) |
| `filters.ts` | Date range, branch, period normalization |
| `time-bucketing.ts` | Daily/weekly/monthly grouping, peak days |
| `kpi-calculators.ts` | `calculateVisitKPIs`, `calculateStatusBreakdown`, `calculateNoShowRate`, `calculateAvgDuration` |
| `breakdown-builders.ts` | Group by branch, host, hour, status |
| `no-show.engine.ts` | Canonical `isNoShowVisit()` (re-exported via `lib/visits/no-show.ts`) |
| `visit-dataset.ts` | In-flight deduplication — one `findMany` per org/range/branch per request cycle |

**Cache layer (`lib/analytics/cache/`):**

- Structured keys: `analytics:org:{orgId}:dashboard:{period}:{hash}` etc.
- `getAnalyticsCache` / `setAnalyticsCache` / `invalidateAnalyticsCache`
- 10-minute TTL
- Event-driven invalidation wired to `visit.service.ts`, `visit-override.service.ts`, `approval.service.ts`

---

### Phase 5.6B — Snapshot Engine (Precomputed Intelligence)

**Status:** COMPLETE

**Schema addition (safe):** `AnalyticsSnapshot` table — migration `20260618120000_analytics_snapshots`

| Field | Purpose |
|-------|---------|
| `organizationId`, `type`, `period`, `periodStart` | Unique snapshot key |
| `periodEnd`, `data` (JSON) | Precomputed analytics payload |
| `createdAt`, `updatedAt` | TTL freshness |

**Snapshot TTL:**

| Period | Refresh TTL |
|--------|-------------|
| Daily | 1 hour |
| Weekly | 6 hours |
| Monthly | 12 hours |

**Services (`lib/analytics/snapshots/`):**

- `snapshot-engine.service.ts` — build/rebuild orchestration
- `snapshot-writer.service.ts` — persists via shared live-query calculators (no duplicated logic)
- `snapshot-reader.service.ts` — serves snapshot when fresh; graceful fallback if table missing or stale
- `snapshot-scheduler.service.ts` — `generateDailySnapshots()`, `generateWeeklySnapshots()`, `generateMonthlySnapshots()`
- `snapshot-rebuild.ts` — `triggerSnapshotRebuild(orgId)` debounced on visit/override changes

**Read path:**

```
1. In-memory cache hit → return
2. Snapshot hit (eligible filters, fresh TTL) → return + promote to cache
3. Live aggregation → cache + async snapshot backfill
```

**Cron endpoint:** `POST /api/v1/internal/analytics-snapshots` — `{ "job": "daily" | "weekly" | "monthly" | "all" }` (Bearer `ANALYTICS_SNAPSHOT_CRON_SECRET`)

**Snapshot eligibility:** `daily` / `weekly` / `monthly` only; no `branchId`, `hostId`, `category`, or custom date filters (those use live query).

---

### Phase 5 data model map (sources → metrics)

| Source | Fields used | Metrics derived |
|--------|-------------|-----------------|
| **Visit** | `createdAt`, `status`, `branchId`, `hostMemberId`, `visitorId`, `checkedInAt`, `checkedOutAt`, `scheduledAt` | KPIs, trends, branch traffic, host rankings, duration, no-shows |
| **Visitor** (via visit) | `id`, name | First-time vs returning per branch |
| **Branch** (via visit join) | `id`, `name` | Traffic, completion rate, peak hours/days |
| **Host** (via visit join) | `hostMemberId`, user name | Leaderboard, volumes, avg duration |
| **AuditLog** | override actions | Security override frequency |
| **ActivityStream** (Phase 2.2) | unified events | Audit activity table |
| **VisitEvent** | approval/check-in events | (via activity stream; not re-implemented) |

**Shared utilities:**

- `lib/analytics/date-ranges.ts` — period resolution (daily/weekly/monthly/custom)
- `lib/analytics/visit-rows.ts` — `loadAnalyticsVisitRows()`, minimal Prisma `select`
- `lib/analytics/export-utils.ts` — CSV/Excel/PDF client transforms

---

### Phase 5 architecture (final)

```
Operational Data (Visit, VisitEvent, AuditLog, ActivityStream)
        ↓
lib/analytics/* (date ranges, visit rows, calculators, bucketing)
        ↓
queryAnalytics() ──→ [cache] ──→ [snapshot reader] ──→ live aggregation
        ↓
Thin service wrappers (analytics-*.service.ts)
        ↓
GET /api/v1/analytics/* (tenant-scoped, VISITOR_READ)
        ↓
/analytics UI (AnalyticsPage + tab panels)
        ↓
Export Center (CSV / Excel / PDF)
```

**Background jobs:**

```
Visit create/update/check-in/out/override
        ↓
triggerSnapshotRebuild(orgId) [debounced]
        ↓
Snapshot Writer → AnalyticsSnapshot table

Cron scheduler → all active orgs → periodic snapshot refresh
```

---

### Phase 5 API surface (final)

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `GET /api/v1/analytics/dashboard` | `getAnalyticsDashboard` | KPIs + trends + status breakdown |
| `GET /api/v1/analytics/branches` | `getBranchAnalytics` | Branch traffic, heatmap, trends |
| `GET /api/v1/analytics/hosts` | `getHostAnalytics` | Host leaderboard + drilldown |
| `GET /api/v1/analytics/audit` | `getAuditAnalytics` | Compliance + security reports |
| `GET /api/v1/analytics/export` | `getAnalyticsExportPayload` | Batched export payload |
| `POST /api/v1/internal/analytics-snapshots` | snapshot scheduler | Background snapshot generation (cron) |

**Shared query params:** `period`, `dateFrom`, `dateTo`, `branchId`, `hostId`, `category` — validated via `parseAnalyticsQuery()` in `lib/validations/api.ts`

**Protection:** all analytics routes require `VISITOR_READ`; tenant-scoped via `withTenant`; read-only (no mutations).

---

### Phase 5 UI layer

**Route:** `/analytics` (sidebar link + `AnalyticsIcon`; middleware matcher)

**Shell:** `AnalyticsPage` — tabs: Dashboard, Branches, Hosts, Audit, Exports

| Component | Section |
|-----------|---------|
| `AnalyticsDashboard` | 5.1 — KPI cards, trend + status charts |
| `BranchAnalyticsPanel` | 5.2 — bar chart, heatmap, trend line |
| `HostAnalyticsPanel` | 5.3 — leaderboard + drilldown |
| `AuditReportsPanel` | 5.5 — compliance/security tables |
| `ExportCenter` | 5.4 — CSV / Excel / PDF |
| `AnalyticsFilters` | Shared date range + branch filter |
| `AnalyticsCharts` | CSS/SVG charts (no chart library dependency) |

**Client API:** `lib/api/analytics.ts`

---

### Phase 5 key files

```
lib/analytics/
  date-ranges.ts, visit-rows.ts, export-utils.ts, cache.ts
  cache/cache-keys.ts, cache.service.ts, cache-invalidation.ts
  query/analytics-query.service.ts, analytics-live-query.ts
  query/filters.ts, time-bucketing.ts, kpi-calculators.ts
  query/breakdown-builders.ts, no-show.engine.ts, visit-dataset.ts
  snapshots/snapshot-*.ts (engine, writer, reader, scheduler, rebuild, types, mappers, context)

lib/services/analytics-dashboard.service.ts   (thin wrapper)
lib/services/analytics-branch.service.ts
lib/services/analytics-host.service.ts
lib/services/analytics-audit.service.ts
lib/services/analytics-export.service.ts

app/api/v1/analytics/{dashboard,branches,hosts,audit,export}/route.ts
app/api/v1/internal/analytics-snapshots/route.ts
app/(app)/analytics/page.tsx
components/analytics/*.tsx
prisma/migrations/20260618120000_analytics_snapshots/
```

---

### Phase 5 performance model

| Principle | Implementation |
|-----------|----------------|
| No N+1 | Single `loadAnalyticsVisitRows()` per range; in-flight dedup via `getAnalyticsVisitDataset()` |
| One-pass aggregation | In-memory bucketing by day/hour/branch/host |
| Cached responses | 10-min in-memory TTL keyed by `orgId + type + period + filters` |
| Snapshot reads | O(1) DB read when eligible + fresh; bypasses aggregation |
| Parallel counts | Dashboard daily/weekly/monthly `count()` in parallel |
| Minimal selects | Visit query selects only fields needed for analytics |
| Export batching | One export API call; format generation client-side |

---

### Phase 5 integration points (reused, not rebuilt)

| Phase 2/3 capability | Phase 5 usage |
|---------------------|---------------|
| Activity Stream (2.2) | Audit panel activity table via `getActivityStream()` |
| Visitor Insights no-show rule | `no-show.engine.ts` (shared with timeline/insights) |
| Command Center metrics | **Not duplicated** — analytics is management-facing, separate route |
| Unified Search (3.1) | **Not duplicated** |
| Visitor 360 / Timeline | **Not duplicated** |

**Invalidation hooks (non-invasive):**

- `visit.service.ts` — create + status change → cache invalidation + `triggerSnapshotRebuild`
- `visit-override.service.ts` — force check-in/out → cache invalidation + snapshot rebuild
- `approval.service.ts` — approve/reject → dashboard cache invalidation only

---

### Phase 5 status matrix

| Area | Status |
|------|--------|
| Dashboard analytics (5.1) | ✅ Complete |
| Branch analytics (5.2) | ✅ Complete |
| Host analytics (5.3) | ✅ Complete |
| Export system (5.4) | ✅ Complete |
| Audit reporting (5.5) | ✅ Complete |
| Query layer refactor (5.6A) | ✅ Complete |
| Snapshot engine (5.6B) | ✅ Complete |
| Navigation + `/analytics` route | ✅ Complete |
| `npx tsc --noEmit` | ✅ Passed |
| No workflow regressions | ✅ Verified |
| No permission changes | ✅ Verified (`VISITOR_READ` only) |

**Overall Phase 5 readiness:** COMPLETE — **FROZEN**

No further Phase 5 changes unless explicitly required for Phase 6 integration.

---

### What Phase 5 enables

Management can now:

- Track daily/weekly/monthly visitor traffic trends
- Compare branch performance and peak periods
- Rank hosts by visit volume and duration
- Export operational reports (CSV, Excel, PDF)
- Review compliance issues (missing check-outs, approval delays)
- Audit security behavior (force overrides, suspicious patterns)
- Do all of the above without affecting live reception operations

---

## PHASE 6 COMPLETION SNAPSHOT

**Version:** Notifications & Workflow Completion  
**Status:** COMPLETE + STABLE + PRODUCTION READY (FROZEN)  
**Date:** June 2026

**Objective:** Complete the operational system with a unified, event-driven notification layer that keeps stakeholders informed in real time — without changing visit lifecycle, approval logic, QR/reception flows, or Phases 1–5 APIs.

### Core design principle

Phase 6 is a **side-effect projection layer only**:

```
READ existing events → PROJECT notifications → DELIVER in-app (+ channel stubs)
```

It does **not** introduce new state machines, duplicate event tracking, or modify business rules. Notifications are async, non-blocking, and fail silently on delivery errors (log only).

### Phase 6 architecture

```
Visit / Approval / Override (existing services)
        ↓ fire-and-forget
emitNotification() / projectVisitStatusNotification()
        ↓
In-memory async queue (setImmediate)
        ↓
mapEventToNotifications() (pure projection)
        ↓
deliverNotificationBatch() → AppNotification + channel stubs
        ↓
NotificationBell / NotificationCenter (poll + instant mark-read)
```

---

### Phase 6.1 — Visitor Arrival Notifications

**Status:** COMPLETE

**Triggers:** successful check-in (`updateVisitStatus` → `CHECKED_IN`); force check-in (`FORCE_CHECKIN`)

**Domain event:** `VISITOR_ARRIVED`

**Recipients:** host (primary); optional CC: org users with `BRANCH_MANAGE` / `USER_MANAGE`

**Hook:** `visit.service.ts` → `projectVisitStatusNotification()`; `visit-override.service.ts` (forced)

---

### Phase 6.2 — Approval Notifications

**Status:** COMPLETE

| Type | Trigger | Domain event |
|------|---------|--------------|
| Approval request | Visit enters pending approval | `APPROVAL_REQUEST` |
| Approval reminder | Pending > 15 min (lazy on `GET /notifications`) | `APPROVAL_REMINDER` |

**Recipients:** host + approvers (same rules as Phase 3 approval routing)

**Hook:** `approval.service.ts` → `emitNotification()`; reminder via `projectApprovalReminderNotifications()`

---

### Phase 6.3 — Visit Status Notifications

**Status:** COMPLETE

| Status transition | Domain event |
|-------------------|--------------|
| Approved | `VISIT_APPROVED` |
| Rejected | `VISIT_REJECTED` |
| Cancelled | `VISIT_CANCELLED` |
| Checked out | `VISIT_COMPLETED` |

**Security overrides:** `SECURITY_OVERRIDE` on force check-in/out (recipients: security role holders)

---

### Phase 6.4 — Notification Center

**Status:** COMPLETE

**UI:**

| Component | Purpose |
|-----------|---------|
| `NotificationBell` | Header bell + unread badge + 30s polling |
| `NotificationDropdown` | Quick panel; mark read; link to center |
| `NotificationCenterPage` | `/notifications` — full history + category filters |

**Filters:** All, Arrivals, Approvals, System

**Storage:** Reuses existing `AppNotification` table (no schema migration)

| Field mapping | AppNotification column |
|---------------|------------------------|
| `recipientId` | `userId` |
| `message` | `body` |
| `visitId` / `visitorId` | `resourceType` + `resourceId` |
| `readAt` | `readAt` |

---

### Phase 6.5 — Channel Abstraction (future-ready)

**Status:** COMPLETE (stubs only — no external delivery)

```typescript
interface INotificationChannel {
  name: string;
  deliver(message: NotificationChannelMessage): Promise<void>;
}
```

**Stubs:** `email`, `slack`, `teams`, `sms`, `whatsapp` — dev console log only

**Files:** `lib/notifications/channels/*`

---

### Phase 6 event mapping table

| Trigger | Domain event | Recipients | Category |
|---------|--------------|------------|----------|
| Check-in | `VISITOR_ARRIVED` | Host + branch admins | arrivals |
| Force check-in | `VISITOR_ARRIVED` + `SECURITY_OVERRIDE` | Host/admins + security | arrivals + system |
| Check-out | `VISIT_COMPLETED` | Host | arrivals |
| Force check-out | `VISIT_COMPLETED` + `SECURITY_OVERRIDE` | Host + security | arrivals + system |
| Approval required | `APPROVAL_REQUEST` | Host + approvers | approvals |
| Pending > 15 min | `APPROVAL_REMINDER` | Approvers | approvals |
| Visit approved | `VISIT_APPROVED` | Host + approvers | approvals |
| Visit rejected | `VISIT_REJECTED` | Host + approvers | approvals |
| Visit cancelled | `VISIT_CANCELLED` | Host | approvals |

---

### Phase 6 API surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/v1/notifications` | GET | List + `unreadCount`; `?category=&unreadOnly=` |
| `POST /api/v1/notifications/read` | POST | `{ id }` — mark one read |
| `POST /api/v1/notifications/read-all` | POST | Mark all read |

**Client:** `lib/api/notifications.ts`

**Permissions:** tenant-scoped; notifications scoped to `ctx.userId`

---

### Phase 6 key files

```
lib/notifications/
  types.ts, categories.ts, queue.ts, recipients.ts
  event-mapper.ts, dispatcher.ts, projector.ts, index.ts
  channels/channel.types.ts, email.channel.ts, external.channels.ts, index.ts

lib/api/notifications.ts
lib/services/notification.service.ts (extended)

components/notifications/
  notification-bell.tsx, notification-dropdown.tsx, notification-center-page.tsx

app/(app)/notifications/page.tsx
app/api/v1/notifications/read/route.ts
app/api/v1/notifications/read-all/route.ts
```

**Service hooks (non-invasive):**

- `visit.service.ts` — status change projection
- `approval.service.ts` — approval events via `emitNotification`
- `visit-override.service.ts` — arrival/completion + security override

---

### Phase 6 status matrix

| Area | Status |
|------|--------|
| Visitor arrival notifications (6.1) | ✅ Complete |
| Approval + reminder notifications (6.2) | ✅ Complete |
| Visit status notifications (6.3) | ✅ Complete |
| Notification center UI (6.4) | ✅ Complete |
| Channel abstraction stubs (6.5) | ✅ Complete |
| Async non-blocking delivery | ✅ Complete |
| No workflow / API regressions | ✅ Verified |
| `npx tsc --noEmit` | ✅ Passed |

**Overall Phase 6 readiness:** COMPLETE — **FROZEN**

---

### What Phase 6 enables

Staff can now:

- See visitor arrivals instantly in the notification bell
- Receive approval requests and reminders in real time
- Track visit status changes (approved, rejected, cancelled, completed)
- Review security override alerts
- Access full notification history at `/notifications`
- Mark notifications read without page refresh

**Not yet implemented (by design):** external email/SMS/Slack/Teams/WhatsApp delivery; WebSocket push (polling used today).

### Phase 6 future integration roadmap

1. Wire `email.channel.ts` to nodemailer/SendGrid (`emailEnabled` org setting)
2. Slack/Teams webhooks per org
3. SMS/WhatsApp via Twilio (`smsEnabled`)
4. Cron-based approval reminders (replace lazy-on-list)
5. Visitor-facing notification channels
6. WebSocket/SSE for instant badge updates

---

## SYSTEM STATE AFTER PHASE 6 (2026-06-18)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architecture | 95% | Server-authoritative check-in; unified state model |
| Policy enforcement | 100% | `enforceVisitCheckInPolicy` on all check-in paths |
| QR security | 100% | Server verify on all scan surfaces |
| State consistency | 100% | `VisitState` on all check-in responses |
| Recovery layer | 95% | Retry, timeout, camera, poll failure UX |
| Soft-lock prevention | 100% | No known approval/scan dead-ends |
| Reception/kiosk parity | 90% | Identity step kiosk-only; staff QR is instant (by design) |
| Visitor lifecycle | 95% | Timeline, activity stream, insights, notes/tags, Visitor 360 |
| **Operator tooling (Reception)** | **95%** | Unified search, command center, rescue, duplicates, overrides, IA refactor |
| **Reporting & analytics** | **90%** | Dashboard, branch/host analytics, audit reports, exports, snapshot engine |
| **Notifications (in-app)** | **85%** | Bell, center, arrival/approval/status projections; channel stubs only |
| Production readiness | 93–95% | Phases 1–3, 5–6 complete; Phases 4, 7–8 remain |

### Remaining production work (Phases 4, 7–8)

- Phase 4 Media storage infrastructure
- Phase 7 Enterprise policies (permission-aware UI gating)
- Phase 8 Branding & product polish
- External notification delivery (email/SMS/Slack — channel stubs ready)

### Flow integrity map (canonical — post-Phase 1)

```
Kiosk QR/Booking:
  scan/search → resolveVisitFromQr → identity → (capture?) → runKioskCheckIn

Reception QR:
  scan → resolveQrWithRetry → (capture?) → runKioskCheckIn → approval states / success

Reception manual:
  lookup → checkInVisit(source: reception) → approval states / success

Register:
  details → identity? → capture → review → registerWalkInVisit → media → check-in
```

### Superseded claims (do not repeat)

Pre-Phase-1 audit findings that are **no longer accurate**: client-orchestrated policy; QR client-only trust; server does not re-validate policies; `PENDING` dead-ends; reception error overlays on approval states; silent scan ignores; resilience layer major gap; check-in API omits `state`.

---

> **Historical reference:** Sections below document Phase 8–10.1 implementation history and pre-Phase-1/2/3 audit findings. Consult **PHASE 1**, **PHASE 2**, **PHASE 3**, and **PHASE 5 COMPLETION SNAPSHOTS** above for current truth.

---

## PHASE 10.1 SNAPSHOT — POST-APPROVAL ENGINE POLISH (2026-06-10)

> **Snapshot purpose:** Stable checkpoint after unified identity, Visit Engine, Approval Engine, kiosk flows, badge printing, Visit Details redesign, and media persistence. **Before** Phase 10.2 approval & kiosk UX refinements.

### Core architecture status

| Area | Status |
|------|--------|
| Visitor identity resolution | **Finalized** — `resolveVisitorIdentity` → use existing OR create separate; no silent merge; `getOrCreateVisitor()` legacy only |
| Visit Engine | **Stable** — `lib/visits/visit-engine.ts` single source of truth |
| Approval Engine | **Stable** — pre-visit + check-in approval; visit-centric UX in Visit Details |
| Kiosk (booking / QR / register) | **Functional** — unified Resolve → Confirm → Execute → Result |
| Badge printing | **Functional** — 62mm × 100mm thermal; print isolation via `#badge-print-root` |
| Visit Details drawer | **Redesigned** — `max-w-6xl`; Overview / Approval (conditional) / Check-In Details / Audit |
| Media persistence | **Implemented** — photo on visitor + `check_in.capture` event; documents in event payload |

### Approval engine — status model

**Pre-visit approval enabled:**

```txt
Create Visit → PENDING_PRE_APPROVAL → APPROVED
```

**Pre-visit approval disabled:**

```txt
Create Visit → SCHEDULED
```

**Check-in approval enabled:**

```txt
Arrival → PENDING_CHECKIN_APPROVAL → CHECKED_IN
```

Pre-visit approve target is **`APPROVED`** (not `SCHEDULED`). Check-in approve target is **`CHECKED_IN`**.

### Visit Details drawer

| Tab | Content |
|-----|---------|
| **Overview** | Visitor, host, visit info, status summary, status progress |
| **Approval** (conditional) | Config, history, approve/reject actions — shown when policy requires or approval records exist |
| **Check-In Details** | Arrival times, captured photo/documents, badge, QR |
| **Audit** | Event timeline from `visit_events` |

Approval actions use existing APIs (`approvePreVisit`, `rejectPreVisit`, `approveVisitCheckIn`, `rejectVisitCheckIn`). Legacy `/approvals` page remains with deprecation banner; primary UX is Visit Details.

Refresh: **manual** + after approve/reject actions (no 8s background polling on approvals page).

### Media capture & persistence

| Asset | Capture | Persistence |
|-------|---------|-------------|
| **Photo** | Webcam (`KioskPhotoCapture`) | `visitor.photoUrl` + `check_in.capture` visit event on check-in |
| **Documents** | Webcam (`KioskDocumentCapture`) | `check_in.capture` event JSON payload (`documents[]`) |

**Pipeline:** kiosk → `visit-engine-client.checkInVisit({ photo, documents })` → `POST /api/v1/visits/check-in` → `persistCheckInCapture()` → `GET /api/v1/visits/[id]` → `resolveCheckInMedia()` → Check-In Details tab.

**Display:** `lib/visits/check-in-media.ts`, `lib/visits/visit-detail-display.ts`, `components/visits/visit-details-checkin-tab.tsx`.

### Approval operations

| Action | Permission |
|--------|------------|
| Approve pre-visit | `visit:approve_pre_visit` |
| Reject pre-visit | `visit:reject` |
| Approve check-in | `visit:approve_checkin` |
| Reject check-in | `visit:reject_checkin` |

### Currently working (Phase 10.1)

- Visitor identity resolution
- Schedule visit
- Visit Engine
- Approval Engine (pre-visit + check-in)
- Search booking kiosk flow
- QR kiosk flow
- New visitor registration flow
- Check-in / check-out
- Badge printing
- Visit Details drawer (tabs + conditional approval)
- Audit timeline
- Media persistence + display in Visit Details

### Open items — Phase 10.2 (next)

| # | Item | Detail |
|---|------|--------|
| 1 | **Remove redundant register review screen** | Target: Capture → Approval/Check-In (skip separate Register review step) |
| 2 | **Verify check-in approval toggle** | Confirm `requireCheckinApproval` → `PENDING_CHECKIN_APPROVAL` end-to-end |
| 3 | **Double capture bug** | After approval, kiosk may re-prompt capture; target: capture once → approval → check-in |
| 4 | **Media display regression** | Verify photo/documents still render in Visit Details after approval path |
| 5 | **Visit drawer width** | Evaluate `max-w-6xl` → `max-w-5xl` for layout balance |

**Phase 10.2 scope:** Approval behavior verification, kiosk flow simplification, media display stabilization, Visit Details UX polish. **No** schema changes, workflow engine redesign, or kiosk architecture changes planned.

---

## 0. Frontend & Kiosk Status (Current)

### FRONTEND STATUS

#### ✅ Completed

| Area | Route / location | Notes |
|------|------------------|-------|
| **Auth flow** | `app/(auth)/login/` | Credentials login, session, org context |
| **Dashboard** | `app/(app)/page.tsx` | Stats, quick actions, live activity |
| **Visitors module** | `/visitors` | Profile list, search, drawer; primary CTA **Schedule visit**; secondary **Add profile** |
| **Visits module** | `/visits`, `/visits/new` | List, filters; **Schedule Visit** dual-path (existing visitor vs new visitor) |
| **Schedule Visit flow** | `/visits/new` | Mode selector, searchable existing visitor, inline new-visitor form, visit-first UX |
| **Visitor state integrity** | `lib/visits/detach.ts`, API clients | Detached visitor/visit snapshots at API boundaries; immutable state merges — **no React-level row corruption** |
| **Reception console** | `/reception` | Four workspaces (Command, Search, Operations, Activity); action bar; QR drawer; unified search; command center; rescue; duplicates; overrides |
| **Kiosk system** | `/kiosk` | Fullscreen self-service terminal (`KioskShell`) |
| **Shared kiosk UX system** | `components/kiosk/` | Shared confirm, result, frame, tokens |
| **Unified visitor lifecycle UX** | QR + booking + register | Same **Resolve → Confirm → Execute → Result** model |
| **Branch operational settings UI** | `/settings/branches/[branchId]` | Operational policies editor; `config.operational` load/save |
| **Branch management (minimal)** | `/settings/branches` | Create branch modal, list from `branches` table, metadata edit |

#### 🟡 Incomplete / stub

| Area | Status |
|------|--------|
| **Settings** | Org/flags at `/dashboard/settings`; branch ops at `/settings/branches/*` — operational policies load/save (schema stabilized) |
| **Operational policy enforcement (staff)** | `config.operational` in services | **Kiosk enforces** policies (Phase 8 Step 4); `/visits/new` and `/reception` do not client-enforce visit hours / walk-in flags |
| **Visitor identity resolution UI** | Staff + kiosk register flows | **Implemented** — `resolveVisitorIdentity` + `VisitorIdentityResolutionCard`; explicit use existing / create separate / cancel |
| **Kiosk booking flow** | `/kiosk` → booking | **Complete** — Search → Identity → Capture → Check-in → Badge → Result; approval-pending phase; Visit Engine + thermal print isolation |
| **Kiosk QR flow** | `/kiosk` → qr | **Complete** — Scan → Resolve → Identity → Capture → Check-in → Badge → Result; `qr-decoder-engine`; recoverable failures |
| **Kiosk register flow** | `/kiosk` → register | **Complete** — Details → Identity → Capture → Review → Register + Check-in → Badge → Result; parity with booking/QR |
| **Visit Details drawer** | `/visits` row click | **Redesigned (Phase 10)** — `max-w-6xl`; Overview / Approval (conditional) / Check-In Details / Audit; manual refresh |
| **Visit approval operations** | Visit Details + `/approvals` (legacy) | Approve/reject pre-visit and check-in; permissions gated; legacy page deprecated |
| **Check-in media persistence** | `lib/visits/check-in-media.ts`, check-in API | Photo → visitor; photo + docs → `check_in.capture` event; displayed in Check-In Details tab |
| **Resilience layer** | Kiosk + reception | Timeout standardization, retry flows, network degradation, camera recovery consistency, no-dead-state guarantees — incomplete |
| **Notifications** | Placeholder bell only; no email/SMS UI or delivery |
| **Reports / analytics** | **Built** — `/analytics`; dashboard, branch/host, audit, exports; snapshot engine (Phase 5) |
| **Org management** | Org switcher placeholder; no full admin UI |
| **Permissions / roles UI** | `permissions[]` in session; buttons not gated |
| **File upload persistence (blob/S3)** | Not built — capture persisted via visitor + visit events (data URLs); no object storage API |
| **Real badge printer integration** | Thermal badge preview + browser print window only |

---

### KIOSK ARCHITECTURE (final)

> **The system is now ONE unified visitor management experience with responsive density only.**

There is **no** runtime device-mode system, **no** reception-mode branching, **no** tablet-mode logic, and **no** operator-first UX divergence in the codebase. Kiosk, tablet, and desktop viewports use the **same flows and components**; only Tailwind responsive classes (`sm:`, `lg:`) and `kiosk-ui.ts` tokens adjust spacing, typography, and touch targets.

**Viewport differences are CSS-only. Behavioral logic is identical everywhere.**

#### Shared flow model

```
Resolve → Confirm → Execute → Result
```

| Stage | Rule |
|-------|------|
| **Resolve** | Read-only — fetch or prepare data; **no mutations** |
| **Confirm** | Explicit user decision before any API write |
| **Execute** | `checkInVisit`, `checkOutVisit`, or `registerVisit` only after confirm |
| **Result** | Shared `KioskResultScreen`; auto-return ~3.5s (`KIOSK_SUCCESS_DISMISS_MS`) |

Used identically by:

- **QR flow** (`kiosk-qr-flow.tsx`)
- **Booking flow** (`kiosk-booking-flow.tsx`)
- **Registration flow** (`kiosk-register-flow.tsx`)

#### Shell (unchanged)

- `kiosk-shell.tsx` — routes `home` \| `qr` \| `booking` \| `register`
- `use-kiosk-inactivity.ts` — 60s idle → home when not on home screen
- `use-kiosk-lockdown.ts` — context-menu / back-navigation lockdown only (**no auto-fullscreen** — `useKioskFullscreen` removed from shell)

---

### QR FLOW (`kiosk-qr-flow.tsx`) — **COMPLETE / STABILIZED (Phase 9, 2026-06-10)**

QR is **only a fast visit resolver** — after resolve, lifecycle is **identical to booking flow**. Contained fully in `KioskFlowFrame` — **no fullscreen takeover, no fatal error pages**.

**Final pipeline:**

```
Scan → Resolve → Identity Confirm → Capture → Check-in → Badge → Result → Reset
```

**Phases:** `scan` \| `identity` \| `confirm-checkout` \| `capture` \| `approval-pending` \| `badge` \| `result`

| Step | Component | Behavior |
|------|-----------|----------|
| **1. Scan** | `kiosk-qr-scanner.tsx` + `qr-decoder-engine.ts` | Contained scanner; multi-frame decode (3 consistent matches); brightness/contrast preprocessing; `BarcodeDetector` + html5-qrcode fallback; 15s load timeout; remount-safe lifecycle |
| **2. Resolve** | `lib/kiosk/qr-token.ts` → `getVisit()` | Client decode → `visitId`; read-only fetch (**no mutation**) |
| **3. Identity confirm** | `kiosk-visit-identity-confirm.tsx` | Same as booking — “Yes, this is me” / “Not me”; no camera |
| **4. Capture** | `kiosk-booking-capture.tsx` | Shared with booking — webcam photo + documents |
| **5. Check-in/out** | `visit-engine-client.checkInVisit()` / `checkOutVisit()` | Unified visit engine only |
| **6. Badge** | `kiosk-booking-badge.tsx` | Shared two-panel badge + thermal print isolation |
| **7. Result** | `KioskResultScreen` `layout="contained"` | Auto-dismiss ~3.5s → **reset to scan** |

**Check-out path:** Identity → `confirm-checkout` → explicit check-out (skips capture).

**Recoverable failures** (`kiosk-qr-recover-panel.tsx`):

| Condition | UX |
|-----------|-----|
| QR invalid | Stays in `scan` phase; amber recover panel — Retry scan / Find booking / Reception hint |
| Camera failure | `KioskQrCameraRecoverPanel` — retry camera / find booking / return home |
| API error (post-check-in) | Contained error result → retry → scan reset |

**Removed anti-patterns:** fullscreen camera takeover, `KioskVisitConfirmCard` overlay, direct QR→check-in bypass, QR-specific badge/capture logic, fatal red dead-end screens.

**QR policy:** `qrRequired` gates QR entry only (`checkInWithQR`, home tile hidden when disabled). Booking/reception unaffected.

---

### BOOKING FLOW (`kiosk-booking-flow.tsx`) — **COMPLETE / STABILIZED (Phase 9, 2026-06-10)**

Enterprise-grade end-to-end visitor check-in via unified Visit Engine. Contained fully in `KioskFlowFrame` — **no route transitions, no browser fullscreen takeover**.

**Final pipeline:**

```
Search → Select → Identity Confirm → Capture → Check-in → Badge → Result → Reset
```

**Phases:** `search` \| `identity` \| `confirm-checkout` \| `capture` \| `approval-pending` \| `badge` \| `result`

| Step | Component | Behavior |
|------|-----------|----------|
| **1. Search** | `kiosk-booking-flow.tsx` | `kioskCompactInput` / `kioskCompactButton` (login-density); `POST /api/v1/visits/search` |
| **2. Results** | `kiosk-booking-results.tsx` | `grid-cols-1 sm:grid-cols-2` — name, company, host, branch, purpose, time, status; full card tap |
| **3. Select** | — | Sets `selectedVisit`; **no mutation** on tap |
| **4. Identity confirm** | `kiosk-visit-identity-confirm.tsx` | **Verification only** — “Yes, this is me” / “Not me”; **no camera**, no check-in, no badge |
| **5. Capture** | `kiosk-booking-capture.tsx` | **Only after** identity (check-in path); camera left, visit context right; `cameraActive` gating |
| **6. Check-in** | `visit-engine-client.checkInVisit()` | Unified visit engine only |
| **7. Badge** | `kiosk-booking-badge.tsx` | Dedicated phase when `badgePrintingEnabled` + badge data; **explicit Continue** (no auto-dismiss) |
| **8. Result** | `KioskResultScreen` `layout="contained"` | Auto-dismiss ~3.5s → **reset to booking search** (not kiosk home) |

**Check-out path:** Identity confirm → `confirm-checkout` (`kiosk-checkout-confirm.tsx`) → explicit “Check out” → `checkOutVisit()` (skips capture).

**Capture rules (locked):**

| Asset | Source |
|-------|--------|
| Visitor photo | Webcam only (`KioskPhotoCapture`, `cameraActive` in capture phase only) |
| Supporting documents | Webcam only (`KioskDocumentCapture` — no file picker; lazy document camera) |

**Badge experience (two-panel):**

```
┌──────────────────────┬──────────────────────────┐
│  KioskBadgePanel     │  KioskBadgeDetailsPanel  │
│  (#badge-print-root) │  (actions + visit info)  │
└──────────────────────┴──────────────────────────┘
```

- Left: printable thermal badge — logo, name, company, host, branch, badge code, QR (`VisitBadgeQr` from `badge.qr.payload`), captured visitor photo
- Right: larger photo preview, visit details, print status, Print + Continue
- Layout: `md:grid-cols-[420px,minmax(0,1fr)]`
- Print: `printThermalBadge()` → `window.print()` + `#badge-print-root` isolation + `@page { size: 62mm 100mm; margin: 0 }`; details panel hidden in print

**Policy enforcement (via `config.operational`):** `kioskEnabled`, `allowWalkIns`, `requireVisitorPhoto`, `requireVisitorDocuments`, visit-hour restrictions, `badgePrintingEnabled`.

**QR setting isolation:** `qrRequired` affects **QR scanner flow only** (`checkInWithQR`, QR tile hidden when disabled). Booking / reception / `visitId` check-in unaffected (`lib/api/check-in-out.ts`, `checkInWithVisitId`).

**Visit Engine:** `checkInVisit()` / `checkOutVisit()` from `visit-engine-client.ts` only — no isolated booking check-in logic.

**Legacy / unused:** `kiosk-booking-card.tsx` — not imported.

---

### REGISTRATION FLOW (`kiosk-register-flow.tsx`) — **COMPLETE / STABILIZED (2026-06-10)**

Enterprise walk-in registration aligned with booking + QR via Visit Engine and mandatory identity resolution. Contained in `KioskFlowFrame` — **no 4-step wizard**, **no `KioskStepProgress`**, **no `KioskVisitConfirmCard` intermediate check-in**.

**Final pipeline:**

```
Details → Identity Resolution → Capture → Review → Register + Check-in → Badge → Result → Reset
```

**Phases:** `details` \| `identity-resolution` \| `capture` \| `review` \| `approval-pending` \| `badge` \| `result`

| Step | Component | Behavior |
|------|-----------|----------|
| **1. Details** | `kiosk-register-form.tsx` | Compact form (`kioskCompactInput` / `kioskCompactButton`); personal + visit fields; email OR phone required |
| **2. Identity** | `VisitorIdentityResolutionCard` | `checkVisitorIdentityConflict()` before capture; explicit use existing / create separate / cancel |
| **3. Capture** | `kiosk-capture-step.tsx` | Two-column — camera left, preview right; webcam only |
| **4. Review** | `KioskRegistrationReviewCard` | Explicit **Register** CTA |
| **5. Execute** | `registerWalkInVisit()` + `runKioskCheckIn()` | Visit Engine only — no direct `checkInVisit` from `lib/api/visits` |
| **6. Approval** | `KioskApprovalPending` | Non-blocking polling when policy requires approval |
| **7. Badge** | `KioskBookingBadge` | Shared two-panel badge + thermal print isolation |
| **8. Result** | `KioskResultScreen` `layout="contained"` | Auto-dismiss → reset to details |

**Policy enforcement:** same `config.operational` gates as booking/QR (`kioskEnabled`, `allowWalkIns`, visit hours, photo/doc requirements, `badgePrintingEnabled`).

**Photo/documents:** persisted on check-in via `persistCheckInCapture()` — photo on `visitor.photoUrl`, documents in `check_in.capture` visit event payload. Displayed in Visit Details → Check-In Details tab.

**Errors:** `KioskQrRecoverPanel` pattern for recoverable failures; policy blocks surfaced inline.

---

### SHARED KIOSK COMPONENTS

| Component | File | Purpose |
|-----------|------|---------|
| **KioskApprovalPending** | `kiosk-approval-pending.tsx` | Non-blocking amber card; background poll via `use-visit-approval-poll.ts`; **booking + QR + register** |
| **KioskRegisterForm** | `kiosk-register-form.tsx` | Compact register details form + Zod schema |
| **KioskRegisterCapture** | `kiosk-capture-step.tsx` | Register capture step — two-column webcam layout |
| **KioskRegistrationReviewCard** | `kiosk-confirm-card.tsx` | Review — contact, purpose, docs, photo preview, Register CTA |
| **KioskVisitConfirmCard** | `kiosk-confirm-card.tsx` | **Legacy** — no longer used in register flow |
| **KioskConfirmCardShell** | `kiosk-confirm-card.tsx` | Shared card layout shell |
| **KioskConfirmOverlay** | `kiosk-confirm-card.tsx` | **Legacy** overlay |
| **KioskResultScreen** | `kiosk-result-screen.tsx` | Result layer — `layout="contained"` in booking/QR; fullscreen variant legacy |
| **KioskResolvingHint** | `kiosk-resolving-hint.tsx` | Inline “Resolving…” for booking search + QR scan resolve |
| **KioskQrScanner** | `kiosk-qr-scanner.tsx` | Contained QR camera lifecycle |
| **KioskQrRecoverPanel** | `kiosk-qr-recover-panel.tsx` | Recoverable QR/camera failure cards |
| **KioskFlowFrame** | `kiosk-flow-frame.tsx` | Header + scrollable main for **booking, QR, register** |
| **KioskPhotoCapture** | `kiosk-photo-capture.tsx` | `getUserMedia` preview + canvas capture → data URL |
| **KioskVisitIdentityConfirm** | `kiosk-visit-identity-confirm.tsx` | **Booking + QR** identity verification — no camera; Yes/Not me |
| **KioskCheckoutConfirm** | `kiosk-checkout-confirm.tsx` | Explicit check-out confirmation after identity (checked-in visits) |
| **KioskBookingCapture** | `kiosk-booking-capture.tsx` | **Booking + QR** post-confirm capture — camera left, visit context right |
| **KioskBookingBadge** | `kiosk-booking-badge.tsx` | **Booking + QR** two-panel badge phase orchestrator |
| **KioskBadgePanel** | `kiosk-badge-panel.tsx` | Printable left panel (`#badge-print-root`) |
| **KioskBadgeDetailsPanel** | `kiosk-badge-details-panel.tsx` | Details + Print / Continue (right panel) |
| **KioskBookingResultsList** | `kiosk-booking-results.tsx` | 2-column search results grid |
| **KioskDocumentCapture** | `kiosk-document-upload.tsx` | Webcam document capture — **no file upload** |
| **VisitBadgeQr** | `visit-badge-qr.tsx` | QR render from `badge.qr.payload` (`qrcode` npm) |
| **KioskInlineBadge** | `kiosk-inline-badge.tsx` | Thermal badge preview + `printThermalBadge()` |
| **KioskFallbackActions** | `kiosk-fallback-actions.tsx` | Standard recovery button stack |
| **KioskStepProgress** | `kiosk-step-progress.tsx` | **Legacy** — removed from register flow |

**Shared confirmation + result system:** All three flows share `KioskVisitIdentityConfirm` (booking/QR) or `VisitorIdentityResolutionCard` (register), `KioskBookingCapture` / `KioskRegisterCapture`, `KioskBookingBadge`, `KioskApprovalPending`, and contained `KioskResultScreen`. No per-flow duplicate capture, badge, or check-in logic.

**Supporting libs:**

- `lib/kiosk/visit-display.ts` — `kioskVisitorName`, `kioskHostLabel`, `kioskVisitMetaLine`
- `lib/kiosk/camera.ts` — camera enumeration + `CameraInitFailure`
- `lib/kiosk/qr-token.ts` — `extractVisitIdFromQrToken()` (client-side QR decode)
- `lib/kiosk/qr-decoder-engine.ts` — multi-frame QR decode pipeline, preprocessing, supplemental loops
- `lib/kiosk/kiosk-check-in-workflow.ts` — shared `runKioskCheckIn()` for all flows
- `lib/kiosk/use-visit-approval-poll.ts` — 4s approval status polling
- `lib/kiosk/print-thermal-badge.ts` — badge-only `window.print()` with `entriss-badge-print` mode
- `lib/visits/visit-engine.ts` / `lib/visits/visit-engine-client.ts` — unified Visit Engine (server + client)
- `lib/visits/workflow-engine.ts` — approval policy evaluation + status helpers

---

### UI SYSTEM (`kiosk-ui.ts`)

**Principles:**

- **Responsive scaling via Tailwind breakpoints only** (`sm:`, `lg:`)
- **No runtime device-mode logic** — no `useDeviceMode`, no `?mode=` override, no kiosk/tablet/reception enums
- **Kiosk is the base experience** — smaller screens use slightly compact tokens; `lg:` scales up for large terminals

**Touch targets:**

- Primary: `kioskTouchPrimary` — `h-14` → `lg:h-16` (56–64px)
- Secondary: `kioskTouchSecondary` — `h-12` → `lg:h-14`
- Minimum effective touch: 48px+ on all breakpoints

**Typography:**

- `kioskStepTitle` — `text-xl` → `sm:text-2xl` → `lg:text-3xl`
- `kioskConfirmName` — `text-3xl` → `lg:text-4xl`
- `kioskSupporting` — `text-base` → `lg:text-xl`

**Spacing / layout:**

- `kioskFlowMain` — responsive page padding (`px-4 py-6` → `lg:px-8`)
- `kioskFlowWide` — `max-w-2xl` → `lg:max-w-5xl`
- `kioskFlowNarrow` — `max-w-xl` → `lg:max-w-2xl`
- `kioskInput` — scales height and font with `lg:`
- `kioskCompactInput` / `kioskCompactButton` — login-density (`h-11`) for booking search

**Timing:**

- `KIOSK_SUCCESS_DISMISS_MS` = 3500
- `KIOSK_ERROR_AUTO_RETURN_MS` = 3500
- `kioskPhaseEnter` — subtle fade on confirm/result transitions

**Example tokens:**

```ts
kioskTouchPrimary  // h-14 … lg:h-16 rounded-2xl
kioskInput         // h-14 … lg:h-16 rounded-2xl
kioskFlowWide      // max-w-2xl lg:max-w-5xl
```

**Design reference:** `docs/KIOSK-INTERACTION-STANDARD.md`

---

### IMPORTANT PRODUCT DECISIONS

#### Host model

- `hostMemberId` is **metadata only** — set from kiosk session on register; not a workflow engine
- Used for visit attribution, badges, reporting, and history display
- No branching logic based on host selection beyond form validation

#### Unified system principle

- **One product** — same visitor lifecycle regardless of entry point (QR, booking search, walk-in register)
- **One flow model** — Resolve → Confirm → Execute → Result everywhere
- **Multiple screen sizes** — responsive CSS only
- **NO behavioral divergence by device** — deprecated device-mode / reception-first approaches are not in codebase

---

### PHASE 8 — BRANCH OPERATIONAL SETTINGS (foundation)

**Status:** Persisted, editable, resolved — **enforced in kiosk** (Phase 8 Step 4); staff scheduling (`/visits/new`) and reception do not client-enforce all policies.

| Piece | Location |
|-------|----------|
| `BranchOperationalSettings` type | `lib/settings/branch-operational.ts` |
| Defaults | `DEFAULT_BRANCH_OPERATIONAL_SETTINGS` |
| Resolution | `resolveBranchConfig()` → `config.operational` (always fully populated) |
| JSON persistence | `BranchSettings.operationalSettings` (+ column-backed fields for overlap) |
| Validation | `lib/validations/branch-operational-settings.ts` |
| Settings UI | `components/settings/branch-operational-settings.tsx` |

**Operational fields** (on `config.operational`):

| Field | Notes |
|-------|-------|
| `requireApproval` | Column-backed |
| `allowWalkIns` | Column-backed |
| `qrExpiryHours` | Derived from `qrExpiryMinutes` |
| `requireVisitorPhoto` | JSON + org default |
| `requireVisitorDocuments` | JSON + org default |
| `kioskEnabled` | JSON |
| `autoCheckInApprovedVisitors` | JSON |
| `badgePrintingEnabled` | JSON |
| `allowedVisitStartHour` | JSON (`HH:mm`) |
| `allowedVisitEndHour` | JSON (`HH:mm`) |

**PATCH:** `PATCH /api/v1/settings/branches/[branchId]` with `{ operational: { ... } }`.

---

### PHASE 8 — BRANCH MANAGEMENT (minimal)

Branches are **organizational infrastructure** — loaded from the `branches` table via canonical APIs, **not** derived from visits.

| Route | Purpose |
|-------|---------|
| `/settings/branches` | Branch list, create modal, empty state |
| `/settings/branches/[branchId]` | Branch information card + operational policies |

| API | Purpose |
|-----|---------|
| `GET /api/v1/branches` | List branches (`lib/services/branch.service.ts`) |
| `POST /api/v1/branches` | Create branch (+ auto `initializeBranchSettingsRecord`) |
| `GET /api/v1/branches/[branchId]` | Get branch metadata |
| `PATCH /api/v1/branches/[branchId]` | Update name, code, description, `isActive` |

**Client:** `lib/api/branches.ts` — `listBranches`, `getBranch`, `createBranch`, `updateBranch`.

**UI:** `components/settings/branch-settings-index.tsx`, `create-branch-modal.tsx`, `branch-information-form.tsx`.

**`Branch` model** includes optional `description` (VARCHAR 500).

---

### CURRENT STABILIZATION WORK (2026-06-10)

Phases 9–10 kiosk/identity/approval work **complete**. Schema + API stabilization **complete**.

| Area | Status |
|------|--------|
| Visitor identity safety | ✅ Finalized |
| Kiosk booking / QR / register | ✅ Unified Visit Engine pipelines |
| QR decoder hardening | ✅ `qr-decoder-engine.ts` |
| Approval workflow engine | ✅ Implemented + settings aligned |
| Branch settings UI | ✅ Migration applied; approval mapper + API fallbacks |

**Next focus:** resilience layer, reception lookup, file upload persistence (see **§0 NEXT RECOMMENDED PRIORITIES**).

---

### PHASE 9 STEP 2 — VISIT FLOW RESTRUCTURE (2026-06-09)

> Canonical domain rules: `docs/product-model.md` (Visitor ≠ Visit).

#### Core change — dual-path visit creation

**Schedule Visit** (`/visits/new`) now supports two explicit modes (replaces prior visitor-first / visit-first confusion):

```
Schedule Visit
├── Existing Visitor → create Visit only
└── New Visitor      → create Visitor + Visit (sequential)
```

| Mode | User action | APIs | Result |
|------|-------------|------|--------|
| **Existing visitor** | Search + select from dropdown | `GET /api/v1/visitors?search=` → `POST /api/v1/visits` | Visit only; **no visitor recreation** |
| **New visitor** | Inline compact identity form | `POST /api/v1/visitors` → `POST /api/v1/visits` | Visitor created (or matched server-side), then visit |

**Existing visitor — visit payload:**

```json
{
  "visitorId": "<selected>",
  "branchId": "<required>",
  "hostMemberId": "<session>",
  "purpose": "<required>",
  "scheduledAt": "<required>"
}
```

*(Product model uses `hostId`; implementation field is `hostMemberId` on `OrganizationMember`.)*

**New visitor — visitor payload then visit payload:**

```json
{ "firstName", "lastName", "email", "phone", "company" }
```

```json
{
  "visitorId": "<from step 1>",
  "branchId", "hostMemberId", "purpose", "scheduledAt"
}
```

Combined register (`POST /api/v1/visits` register envelope) remains available on backend; Schedule Visit UI prefers explicit paths above for clarity.

#### UI / UX structure (`components/visits/new-visit-*.tsx`)

1. **Mode selector** — Existing Visitor | New Visitor  
2. **Existing visitor mode** — searchable dropdown (name/email/phone), selected visitor preview card, visit details below  
3. **New visitor mode** — compact 2-column visitor fields, then shared visit details  
4. **Shared visit details** — branch, scheduledAt, purpose (always required for submit)

#### Fixed in this phase

| Issue | Resolution |
|-------|------------|
| **Host** | Auto-filled from `session.user.memberId` → `hostMemberId`; read-only badge for staff; not a loading-gated disabled dropdown |
| **Branch** | Always `GET /api/v1/branches`; dropdown never disabled by loading; submit blocked only if branch list empty after load |
| **Mixed model / duplicate forms** | Removed embedded full visitor form duplication; identity vs event creation clearly separated by mode |
| **Blocked Next/submit** | Step readiness depends on `hostMemberId`, `branchId`, `purpose` only — not async branch fetch state |

#### Data model (reinforced)

| Entity | Meaning |
|--------|---------|
| **Visitor** | Person identity (stored once, reused) |
| **Visit** | Event instance; always references a visitor |
| **Host** | Session-based internal employee (`memberId`) |
| **Branch** | Location context from `/api/v1/branches` |

#### What this unblocks

- Pre-registration UX clarity (“what am I creating?”)
- No duplicate visitor forms inside visit scheduling
- Stable host/branch controls (no false-disabled dropdowns)
- Foundation for QR hardening, reception lookup, visit history/audit, photo/doc upload pipeline

---

### PHASE 9 STEP 3 — FRONTEND IDENTITY DETACHMENT (2026-06-09)

> Fixes React-level visitor display corruption (all rows showing newest visitor name).

#### Problem

Creating or editing one visitor caused **all visit rows and visitor list rows** to display the same identity. Root cause: **shared nested `visitor` object references** in React state plus **non-immutable merges** (shallow spreads reusing `visit.visitor`, `mergeVisitStats` returning same row reference, selector passing API objects by reference).

#### Fix (`lib/visits/detach.ts`)

| Helper | Purpose |
|--------|---------|
| `detachVisitorSnapshot` | Independent visitor copy per visit row |
| `detachVisitWithRelations` | Deep-detach visit + nested relations |
| `detachVisits` / `detachVisitorRecord(s)` | Batch detachment |

Applied at:

- `lib/api/visits.ts`, `lib/api/visitors.ts` (and `.server.ts` variants) — **every API ingress**
- `lib/visits/search-visits.ts` — merged search results
- `components/visits/visits-page.tsx` — `patchVisitInList`, `handleQrGenerated`
- `components/visitors/visitors-page.tsx` — `toVisitorRow`, `mergeVisitStats`, `openVisitor`, `handleCreated`
- `components/visits/visitor-selector.tsx` — `onSelect(detachVisitorRecord(...))`
- `components/visits/new-visit-form.tsx`, `visitor-profile-drawer.tsx`

**Result:** Each visit row owns its own `visitor` instance. No silent cross-row visual corruption from in-memory aliasing.

**Note:** Backend identity policy now uses explicit resolution paths — see **§0 PHASE 9 IDENTITY RESOLUTION**.

---

### PHASE 9 — VISITOR IDENTITY SAFETY (**IMPLEMENTED**)

#### Critical product insight

Backend **correctly** treats same **email OR phone** as a potential identity match within a tenant. That is operationally acceptable.

**Problem discovered:** The system was **silently** reusing, updating, merging, and overwriting visitor records via `getOrCreateVisitor` / `maybeUpdateReturningVisitor` **without operator confirmation**. This caused:

- Accidental visitor replacement
- Historical confusion
- Shared-email corruption scenarios
- Unsafe operational behavior

#### Approved model — keep matching, remove silent merge

Entriss **keeps** email/phone identity matching. Entriss **removes** silent automatic merging.

**Canonical identity resolution flow:**

```
Phase 1 — Resolve (read-only)
  Backend/helper checks existing email / phone
  Returns existing visitor OR null
  NO mutation

Phase 2 — Human decision (staff UI)
  "Existing visitor found"
  Options:
    • Use existing visitor
    • Create separate visitor
    • Cancel

Result:
  • Repeat visitors preserve history intentionally
  • Duplicate humans can exist when operator chooses
  • Silent overwrites become impossible
```

#### Implementation status

| Need | Status |
|------|--------|
| `resolveVisitor` / `resolveVisitorIdentity` (read-only) | ✅ `lib/visits/visit-engine.ts`, `GET /api/v1/visitors/resolve` |
| Identity confirmation UI | ✅ `VisitorIdentityResolutionCard` — staff + kiosk register |
| Explicit create vs reuse branching | ✅ `createVisitorForStaff`, `forceCreateVisitor` |
| Duplicate-safe visitor creation | ✅ operator “create separate” path |
| Runtime `getOrCreateVisitor()` | **Deprecated / LEGACY ONLY** — removed from runtime UI flows |
| Kiosk register / quick-register | ✅ identity resolution + `registerWalkInVisit` |

**Do not:** remove identity matching, break visit history, redesign kiosk architecture, or change tenant isolation.

#### Clarified semantics

| Entity | Meaning |
|--------|---------|
| **Visitor** | Persistent person record (name, contact, company, historical visit relationships) |
| **Visit** | Scheduled/operational instance (host, branch, purpose, timing, approval/check-in state) |

**Direction:** Reuse visitors **intentionally**; do not recreate visitor records unnecessarily; **allow intentional duplicates** when operator confirms.

#### Reception vs kiosk (clarified)

| Surface | Role |
|---------|------|
| **Reception** (`/reception`) | Staff-assisted operational console — unified search, command center, rescue, duplicates, overrides, Visitor 360 |
| **Kiosk** (`/kiosk`) | Self-service terminal — touch-first, guided flows, restricted surface |

**No separate “reception-mode architecture.”** Separate pages/products with **shared backend behavior** and one behavioral model (kiosk: Resolve → Confirm → Execute → Result).

#### Stable areas — do not rebuild (frozen)

Kiosk shell, all three kiosk flows, Visit Engine, identity resolution, approval workflow + kiosk polling UX, result system, badge two-panel architecture, `qr-decoder-engine`, operational policy resolver, visit state machine, tenant isolation, inactivity system. **Exception:** branch settings **API/resolver only** — schema normalization allowed in next pass.

---

### PHASE 9 — KIOSK BOOKING FLOW COMPLETION (**STABILIZED, 2026-06-10**)

**Status:** COMPLETE — enterprise booking check-in end-to-end via Visit Engine.

**Completed:**

| Area | Detail |
|------|--------|
| Unified Visit Engine | `visit-engine.ts` + `visit-engine-client.ts` — single source for visitor/visit ops |
| Booking pipeline | Search → Identity → Capture → Check-in → Badge → Result → Reset |
| Identity gate | `kiosk-visit-identity-confirm.tsx` — no camera during confirm |
| Check-out gate | `kiosk-checkout-confirm.tsx` — explicit confirmation |
| Capture | Webcam-only photo + documents; camera lifecycle gated to `capture` phase |
| QR policy fix | `qrRequired` scoped to QR flow; booking/reception unaffected |
| Badge UI | Two-panel layout (`KioskBadgePanel` + `KioskBadgeDetailsPanel`) |
| Thermal print | `#badge-print-root`, `@page 62mm×100mm`, badge-only isolation |
| Fullscreen fix | `useKioskFullscreen()` removed from `kiosk-shell.tsx` |
| Resilience | Contained results, safe reset, explicit confirmations, no dead-end fullscreen |

---

### PHASE 9 — KIOSK QR FLOW COMPLETION (**STABILIZED, 2026-06-10**)

**Status:** COMPLETE (architecturally stable) — QR aligned with booking as unified Visit Engine pipeline.

**Completed:**

| Area | Detail |
|------|--------|
| Unified pipeline | Scan → Resolve → Identity → Capture → Check-in → Badge → Result → Reset |
| Containment | All states inside `KioskFlowFrame`; no fullscreen takeover |
| State machine | `scan \| identity \| confirm-checkout \| capture \| badge \| result` |
| Scanner | `kiosk-qr-scanner.tsx` — contained lifecycle, 15s timeout, restart camera |
| Recovery | `kiosk-qr-recover-panel.tsx` — all failures recoverable; no fatal red screens |
| Visit resolve | `lib/kiosk/qr-token.ts` → `getVisit()`; no direct check-in from scan |
| Identity parity | `KioskVisitIdentityConfirm` + `KioskCheckoutConfirm` |
| Capture parity | Shared `KioskBookingCapture` + operational policy enforcement |
| Badge parity | Shared `KioskBookingBadge` + thermal print isolation |
| Visit Engine | `checkInVisit()` / `checkOutVisit()` only — no QR-specific check-in logic |

**Final status:**

| Area | Status |
|------|--------|
| Booking flow | COMPLETE |
| QR flow | COMPLETE (aligned) |
| Capture system | UNIFIED |
| Badge system | UNIFIED |
| Identity system | UNIFIED |
| Visit engine | SINGLE SOURCE OF TRUTH |
| Error handling | RECOVERABLE STATES |

**QR hardening (shipped):** `qr-decoder-engine.ts` — multi-frame buffer, preprocessing, remount-safe scanner lifecycle; visit resolve retries (3× @ 750ms) before error UI. Dev overlay via `NEXT_PUBLIC_KIOSK_QR_DEBUG=true`.

---

### PHASE 10 — VISIT APPROVAL WORKFLOW ENGINE (**COMPLETE + POLISHED, 2026-06-10**)

**Status:** Implemented — policy-driven pre-visit + check-in approval; visit-centric staff UX in Visit Details; non-blocking kiosk polling. Schema alignment complete (see freeze checkpoint).

**Schema** (`prisma/migrations/20260610120000_visit_workflow_engine/`):

- `OrganizationSettings`: `requirePreVisitApproval`, `requireCheckinApproval`, `approvalMode` (`simple` \| `workflow`)
- `VisitStatus`: `DRAFT`, `PENDING_PRE_APPROVAL`, `SCHEDULED`, `PENDING_CHECKIN_APPROVAL` (+ legacy `PENDING` / `AWAITING_APPROVAL` migrated)

**Engine:** `lib/visits/workflow-engine.ts` — `evaluateVisitWorkflow()`, `resolveApprovalPolicy()`, `isVisitAwaitingApproval()`

**Kiosk UX:** `KioskApprovalPending` + `use-visit-approval-poll.ts` (4s) in **booking, QR, register** — auto check-in on approval via `runKioskCheckIn()`

**Check-in gate:** `checkInWithVisitId` returns `{ state: "APPROVAL_REQUIRED", ui: "kiosk-approval-pending" }` when policy blocks

**Override:** `visit:override_approval` permission for staff `approveVisit`

---

### KNOWN LIMITATIONS

| Limitation | Detail |
|------------|--------|
| Photos/documents | **Persisted on check-in** — visitor photo + `check_in.capture` event; pre-fix visits may lack capture data |
| Operational policies (staff scheduling) | Kiosk enforces `config.operational` (Phase 8 Step 4); `/visits/new` does not client-enforce visit hours / walk-in flags |
| No real printer integration | Browser print dialog via badge preview; no ESC/POS or dedicated hardware driver |
| No offline kiosk support | Requires network for all API calls |
| QR depends on browser camera permissions | `getUserMedia` / `html5-qrcode`; recoverable fallback panels on deny/fail |
| Reception QR differs from kiosk | `/reception` instant check-in/out on scan (staff-assisted); kiosk uses confirm pattern — intentional product split |
| Silent visitor merge | **Resolved** — `resolveVisitorIdentity` + explicit UI everywhere |
| Legacy files | `kiosk-booking-card.tsx`, `KioskStepProgress` in register — unused |

---

### NEXT RECOMMENDED PRIORITIES

**Immediate (Phase 10.2):**

1. **Register flow simplification** — remove redundant review/register screen after capture
2. **Check-in approval toggle verification** — `requireCheckinApproval` → `PENDING_CHECKIN_APPROVAL` E2E
3. **Double capture bug** — prevent re-capture after approval in register/booking/QR flows
4. **Media display regression** — verify Visit Details Check-In tab after approval path
5. **Visit drawer width** — evaluate `max-w-5xl` vs `max-w-6xl`

**Also on roadmap:**

6. **Resilience layer** — timeout standardization, retry flows, network degradation, camera recovery
7. ~~**Reception manual lookup**~~ — **superseded by Phase 3.1 unified search** (`GET /api/v1/search/unified`)
8. **Blob/S3 object storage** — optional upgrade from data-URL / event payload storage
9. **Reports / analytics** — operational dashboards, exports
10. **Org switcher wiring** — `switchOrganization` + `session.update()`
11. **Permission-aware UI** — gate actions by `session.user.permissions`

- Badge printing integration (real thermal driver / ESC/POS)
- Notifications (email / SMS)
- Role / permission management UI
- Full org settings surface at `/dashboard/settings`

**Do not pursue (frozen):**

- Feature expansion, UI redesign, workflow redesign
- Device-mode systems
- Separate reception UX product / operator-first branching
- Multi-product behavioral branching by viewport
- Alternate kiosk architectures that duplicate flows per device

---

### Kiosk component inventory (current)

```
components/kiosk/
├── kiosk-shell.tsx              # screen router (unchanged)
├── kiosk-home.tsx
├── kiosk-home-skeleton.tsx
├── kiosk-branding.tsx
├── kiosk-datetime.tsx
├── kiosk-ui.ts                  # responsive tokens only
├── kiosk-confirm-card.tsx       # shared confirm + registration review
├── kiosk-resolving-hint.tsx     # inline + overlay resolving
├── kiosk-fallback-actions.tsx
├── kiosk-header.tsx
├── kiosk-flow-frame.tsx
├── kiosk-qr-flow.tsx
├── kiosk-booking-flow.tsx
├── kiosk-booking-card.tsx       # legacy — unused
├── kiosk-register-flow.tsx
├── kiosk-step-progress.tsx
├── kiosk-sticky-footer.tsx
├── kiosk-result-screen.tsx
├── kiosk-inline-badge.tsx
├── kiosk-photo-capture.tsx
└── kiosk-document-upload.tsx
lib/kiosk/
├── camera.ts
└── visit-display.ts
hooks/
├── use-kiosk-inactivity.ts
└── use-kiosk-lockdown.ts
```

---

## 1. What Entriss Is

Multi-tenant SaaS **Visitor Management System**. Organizations manage visitors, visits, branches, check-in/out, badges, and configurable policies. Platform operators can access all tenants via `SYSTEM_OWNER`.

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| ORM | Prisma 7 (`@prisma/adapter-pg` + `pg`) |
| Database | PostgreSQL (Neon) |
| Auth | NextAuth v4, Credentials provider, JWT sessions |
| Validation | Zod 4 |
| Client output | `app/generated/prisma/` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Fonts | Geist Sans + Geist Mono (next/font) |
| Forms | react-hook-form + @hookform/resolvers/zod |
| Class utils | clsx + tailwind-merge (`lib/utils/cn.ts`) |

**Frontend built:** App shell, auth UI, dashboard, visitors module, visits module, reception console, **Schedule Visit dual-path** (`/visits/new`), self-service kiosk (`/kiosk`), **shared kiosk UX system**, **unified visitor lifecycle UX** across QR/booking/register (Visit Engine + identity resolution + approval-pending), two-panel badge + thermal print isolation, `qr-decoder-engine`, walk-in registration (phase-based, not wizard), kiosk inactivity reset, **check-in media persistence** (photo + documents), **Visit Details drawer** (tabbed, visit-centric approvals), settings hub (`/dashboard/settings` org/flags), **branch management** (`/settings/branches`), **branch operational policies UI** (`/settings/branches/[branchId]`).  
**Not built (frontend):** Full org settings surface (after schema fix), operational policy enforcement in **staff** flows (kiosk enforces), resilience layer, notifications UI, reports/analytics, org switcher wiring, permissions/roles UI gating, file upload persistence, real badge printer integration, visitor photo/document backend storage, host approval queue UI. See **§0 FRONTEND STATUS**.  
**Not built (backend/other):** Email/SMS delivery, Stripe billing, notification queue, photo/document upload storage.

---

## 3. Architecture

**Pattern:** Modular monolith — single Next.js app, domain services, strict tenant isolation.

```
Request → middleware.ts (auth + org context)
       → app/api/v1/* (route handlers, no Prisma)
       → lib/services/* (business logic + RBAC)
       → lib/settings/resolver.ts (config merge)
       → Prisma → PostgreSQL
```

### Multi-tenancy

- **Strategy:** Shared DB, shared schema, `organizationId` on every tenant row.
- **Global tables:** `User`, `Permission`, `Plan`, NextAuth adapter tables.
- **Tenant root:** `Organization`.
- **Access:** `OrganizationMember` links global `User` to org + `Role`.
- **Context:** `TenantContext` (`lib/tenant/tenant-context.ts`) passed to all services.
- **Enforcement:** `requireTenantContext()`, Prisma `where: { organizationId }`, middleware tenant mismatch checks.

### Key types

```typescript
// Session (JWT) includes:
userId, email, systemRole, activeOrganizationId, activeOrganization,
memberId, roleId, permissions[]

// TenantContext (services):
userId, email, systemRole, organizationId, activeOrganization,
memberId, roleId, permissions[], isSystemOwner
```

---

## 4. Modules Completed

| Module | Status | Location |
|--------|--------|----------|
| Auth (credentials, JWT, org switch) | ✅ | `lib/auth/` |
| RBAC (roles, permissions, guards) | ✅ | `lib/rbac/` |
| Seed system (permissions, roles, super admin, demo org) | ✅ | `prisma/seed.ts`, `lib/seed/` |
| Visitor service | ✅ | `lib/services/visitor.service.ts` |
| Visit service + lifecycle | ✅ | `lib/services/visit.service.ts` |
| QR tokens (HMAC signed) | ✅ | `lib/services/qr.service.ts` |
| Badge generation (thermal + A4 fallback) | ✅ | `lib/services/badge.service.ts` |
| Check-in/out (QR + manual) | ✅ | `lib/services/visit.service.ts`, `lib/api/check-in-out.ts` |
| Settings + feature flags | ✅ | `lib/services/settings.service.ts`, `lib/settings/` |
| REST API v1 | ✅ | `app/api/v1/` |
| Audit logging | ✅ | `lib/audit/logger.ts` |
| Rate limiting (login, check-in, search) | ✅ | `lib/auth/rate-limit.ts`, `lib/api/rate-limit.ts` |
| Billing models (stub) | 🟡 Schema only | `Plan`, `Subscription`, `UsageRecord` |
| Approval workflow execution | 🟢 Complete | `workflow-engine.ts`, `approveVisit`, `rejectVisit`; `KioskApprovalPending`; settings aligned via `approval-normalize.ts` |
| Notifications | 🟡 Settings flags only | No email/SMS sender |
| Branch service + minimal CRUD API | ✅ | `lib/services/branch.service.ts`, `GET/POST /api/v1/branches`, `GET/PATCH /api/v1/branches/[branchId]` |
| Branch operational settings foundation | ✅ | `BranchOperationalSettings`, `config.operational`, JSON persistence, validation |
| **Frontend — App shell** | ✅ | `components/layout/`, `app/(app)/layout.tsx` |
| **Frontend — Auth UI** | ✅ | `app/(auth)/login/`, `components/auth/`, `HeaderAuth` |
| **Frontend — Dashboard** | ✅ | `app/(app)/page.tsx`, `components/dashboard/` |
| **Frontend — Visitors** | ✅ | `app/(app)/visitors/`, `components/visitors/` |
| **Frontend — Visits** | ✅ | `/visits`, `/visits/new`, `components/visits/` |
| **Frontend — Reception** | ✅ | `/reception` — Phase 3 operational console (Command, Search, Operations, Activity) |
| **Frontend — Kiosk** | ✅ | `/kiosk`, `app/(kiosk)/`, `components/kiosk/` |
| **Frontend — Shared kiosk UX** | ✅ | `kiosk-confirm-card`, `kiosk-resolving-hint`, `kiosk-ui.ts` |
| **Frontend — Unified visitor lifecycle** | ✅ | QR + booking + register on Resolve → Confirm → Execute → Result |
| **Frontend — Settings** | 🟡 | Org/flags at `/dashboard/settings`; branch ops at `/settings/branches/*`; policies not enforced in flows yet |
| **Frontend — Org switcher** | 🟡 | UI placeholder; no API wiring yet |

---

## 5. Database Models

### Global

| Model | Purpose |
|-------|---------|
| `User` | Identity; `systemRole`, `lastActiveOrganizationId`, `passwordHash` |
| `Account`, `Session`, `VerificationToken` | NextAuth |
| `Permission` | Global permission catalog (12 slugs) |
| `Plan` | Billing plan definitions |

### Tenant-scoped

| Model | Purpose |
|-------|---------|
| `Organization` | Tenant root |
| `OrganizationSettings` | Branding, visitor, check-in, notification config (1:1) |
| `FeatureFlag` | Org key/value flags (JSON `value`) |
| `OrganizationMember` | User ↔ org + role |
| `OrganizationInvite` | Pending invites |
| `Role`, `RolePermission` | Org-scoped RBAC |
| `Branch` | Location; `name`, `slug`, `code`, `description`, `isActive`; legacy `requiresApproval`, `qrSecret`; canonical branch APIs |
| `BranchSettings` | Branch overrides (1:1): `qrExpiryMinutes`, `badgeTemplate`, etc. |
| `Visitor` | Person profile (reusable per org) |
| `Visit` | Single entry event; `qrToken`, `badgeNumber`, status |
| `VisitApproval` | Host approval records |
| `VisitEvent` | Immutable visit timeline |
| `AuditLog` | Append-only action log |
| `Subscription`, `UsageRecord` | Billing stub |

### Enums

`SystemRole`, `VisitStatus`, `ApprovalStatus`, `ApprovalDecision`, `InviteStatus`, `BadgeTemplateType`, `SubscriptionStatus`

### Migrations applied

1. `init_seed_system`
2. `add_last_active_organization`
3. `organization_branch_settings`
4. `branch_operational_settings` — `BranchSettings.operationalSettings` JSONB
5. `branch_description` — `Branch.description` VARCHAR(500)

---

## 6. Auth + RBAC

### Authentication

- **Provider:** Email + password (bcrypt, 12 rounds).
- **Route:** `app/api/auth/[...nextauth]/route.ts`
- **Config:** `lib/auth/auth-options.ts`
- **Super admin:** `superadmin@entriss.local` / `User.systemRole = SYSTEM_OWNER` (all orgs, all permissions in any tenant context).
- **Org resolution on login:** last used org → first membership → first system org (SYSTEM_OWNER).
- **Switch org:** `POST /api/v1/organizations/switch` + client `session.update({ activeOrganizationId })`. (API ready; UI not wired yet.)
- **Login bug fixed (2026-06-08):** `authorize()` called `request.headers.get()` but NextAuth passes a **plain object**, not a `Headers` instance → always threw before DB lookup → 401. Fixed via `lib/auth/request-ip.ts` (`getClientIpFromRequest`).
- **Required env for auth:** `NEXTAUTH_URL` + `NEXTAUTH_SECRET` must be set in `.env` (see `.env.example`).

### Default org roles (seeded per org)

| Role | Slug | Notes |
|------|------|-------|
| Owner | `owner` | All 12 permissions |
| Admin | `admin` | All except `role:manage` |
| Receptionist | `receptionist` | Visitor ops + check-in/out |
| Security | `security` | Read + check-in/out |
| Viewer | `viewer` | `visitor:read`, `audit:read` |

### Permissions (global catalog)

`visitor:create|read|update|delete`, `visit:check_in|check_out|approve|reject`, `branch:manage`, `user:manage`, `role:manage`, `audit:read`

### Guards

- `requirePermission(ctx, slug)` — service layer
- `requireTenantContext()` — API layer
- `middleware.ts` — blocks unauthenticated `/api/v1/*` and app pages (`/`, `/visitors`, `/visits`, `/reception`, `/kiosk`, `/dashboard/*`); requires `activeOrganizationId` on API; prevents cross-tenant URL org mismatch

---

## 7. Settings System

### Models

- **OrganizationSettings** — branding, visitor policy, check-in policy, notifications.
- **BranchSettings** — branch overrides: approval, QR expiry, badge template, walk-ins; **`operationalSettings` JSON** for extended policies.
- **FeatureFlag** — org-level toggles (JSON value).
- **Branch** — tenant locations; `description`, `code`, `slug`, `isActive`; canonical source for settings (not visit-derived).

### Resolver (`lib/settings/resolver.ts`)

```
resolveOrganizationConfig(ctx)  → org settings + feature flags
resolveBranchConfig(ctx, branchId) → deep merge: org ← branch ← flag overrides → config.operational
```

**`config.operational`** (`BranchOperationalSettings` from `lib/settings/branch-operational.ts`) — normalized branch operational policies; always fully populated on `ResolvedBranchConfig`. See **§0 PHASE 8 — BRANCH OPERATIONAL SETTINGS**.

**Flag defaults (seeded on org create):**

| Key | Default |
|-----|---------|
| `ENABLE_SMS_NOTIFICATIONS` | `false` |
| `ENABLE_PHOTO_CAPTURE` | `true` |
| `ENABLE_PRE_REGISTRATION` | `true` |
| `ENABLE_VISITOR_BLACKLIST` | `false` |

**Initialization:** `createOrganizationDefaults()` seeds roles + org settings + flags. `ensureBranchSettings()` lazy-creates branch settings (syncs legacy `Branch` fields).

### Integration (business rules now config-driven)

| Behavior | Source |
|----------|--------|
| Visit initial status (`PENDING` vs `APPROVED`) | `resolveBranchConfig().requiresApproval` |
| Walk-in allowed | `branchConfig.allowWalkIns` |
| QR token expiry | `branchConfig.qrExpiryMinutes` |
| Badge layout | `branchConfig.badgeTemplate` (`standard` \| `minimal` \| `photo`) |
| Manual check-in by `visitId` | `orgConfig.checkIn.manualOverrideAllowed` |
| QR required for check-in | `orgConfig.checkIn.qrRequired` |
| SMS / photo capture | Feature flags override org settings |

---

## 8. Visitor System

### Concepts

- **Visitor** — persistent person identity per org; matched by email/phone **for resolution**, not silent overwrite (see **§0 PHASE 9 IDENTITY RESOLUTION**).
- **Visit** — scheduled/operational event instance linked to visitor, branch, host (`OrganizationMember`). Multiple visits belong to one visitor.

### Visit lifecycle

```
PENDING → APPROVED → CHECKED_IN → CHECKED_OUT
         ↘ REJECTED / CANCELLED (terminal)
```

Transitions validated in `lib/services/visit-transitions.ts` (no skipping states).

### Services (`lib/services/visitor.service.ts`, `visit.service.ts`)

| Method | Purpose |
|--------|---------|
| `getOrCreateVisitor` | **LEGACY ONLY / deprecated** — runtime flows use `resolveVisitor` + explicit create; staff uses `createVisitorForStaff` |
| `findVisitor` | Read-only lookup by id/email/phone — candidate for resolve phase |
| `createVisit` | New visit with config-driven initial status |
| `registerVisitorVisit` | Walk-in flow: visitor + visit |
| `updateVisitStatus` | Validated transitions + `VisitEvent` |
| `checkInWithQR` / `checkInWithVisitId` | Check-in + badge + audit |
| `checkOutWithQR` / `checkOutWithVisitId` | Check-out + audit |
| `findVisitByVisitorDetails` | Reception search fallback |
| `approveVisit` / `rejectVisit` / `cancelVisit` | Workflow actions |
| `listVisitors` / `listVisitsByOrganization` | Paginated lists |

QR auto-generated when visit becomes `APPROVED` (create or approve).

---

## 9. QR System

**File:** `lib/services/qr.service.ts`  
**Secret:** `QR_SIGNING_SECRET` (falls back to `NEXTAUTH_SECRET`)

### Token format

```
entriss.v1.{base64url(payload)}.{hmac-sha256}
payload: { v: 1, visitId, organizationId, exp }
```

- Tamper-proof HMAC verification server-side only.
- Stored on visit: `qrToken`, `qrExpiresAt`.
- Expiry from `branchConfig.qrExpiryMinutes` (or scheduled visit + grace).
- All scan attempts logged to `AuditLog` + `VisitEvent` (valid and invalid).

---

## 10. Badge System

**File:** `lib/services/badge.service.ts`  
**Device abstraction:** `lib/devices/badge-printer.interface.ts` (no vendor implementation)

| Method | Output |
|--------|--------|
| `generateBadgeData` | **Primary** — thermal printer JSON (62×100mm, 203 DPI) |
| `generateA4BadgeLayout` | **Optional** — only when `?format=a4` explicitly requested |

Badge number: `{branchCode}-{seq}` per branch per day. Generated on check-in.

---

## 11. API Structure

**Base:** `/api/v1`  
**Response contract:**

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

**Helpers:** `lib/api/response.ts` (`success`, `error`, `handleApiError`)  
**Wrappers:** `withTenant()`, `withTenantParams()` in `lib/api/with-tenant.ts`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/[...nextauth]` | Login (NextAuth) |
| `GET/POST` | `/api/v1/organizations/switch` | List/switch org |
| `GET` | `/api/v1/branches` | List branches (canonical `branches` table) |
| `POST` | `/api/v1/branches` | Create branch |
| `GET` | `/api/v1/branches/[branchId]` | Branch metadata |
| `PATCH` | `/api/v1/branches/[branchId]` | Update branch metadata |
| `GET/POST` | `/api/v1/visitors` | List / get-or-create visitor |
| `GET/POST` | `/api/v1/visits` | List / create visit (or `{visitor, visit}` register) |
| `GET` | `/api/v1/visits/[visitId]` | Visit details |
| `POST` | `/api/v1/visits/check-in` | `{ qrToken }` or `{ visitId }` |
| `POST` | `/api/v1/visits/check-out` | `{ qrToken }` or `{ visitId }` |
| `POST` | `/api/v1/visits/search` | Reception lookup (email/phone/name) |
| `POST` | `/api/v1/visits/[visitId]/qr` | Generate/return QR token |
| `GET` | `/api/v1/visits/[visitId]/badge` | Thermal badge (default) |
| `GET` | `/api/v1/visits/[visitId]/badge?format=a4` | A4 fallback only |
| `GET/PATCH` | `/api/v1/settings/organization` | Org settings |
| `GET/PATCH` | `/api/v1/settings/branches/[branchId]` | Branch settings + `operational` patch |
| `GET/PUT` | `/api/v1/settings/feature-flags/[key]` | Feature flag |

**Rate limits:** check-in/out 30/min, search 20/min, login 5/15min per email+IP.

---

## 12. Project Layout

```
entriss/
├── app/
│   ├── (app)/                     # Authenticated product routes (AppShell)
│   │   ├── layout.tsx             # Server: session guard + AppShell
│   │   ├── page.tsx               # Dashboard home (/)
│   │   ├── visitors/page.tsx      # Visitors module (/visitors)
│   │   ├── visits/                # Visits module
│   │   │   ├── page.tsx           # /visits list
│   │   │   └── new/page.tsx       # Schedule Visit (/visits/new)
│   │   ├── reception/page.tsx     # Staff reception console (/reception)
│   │   ├── settings/branches/     # Branch list + operational settings (/settings/branches)
│   │   └── dashboard/             # Legacy paths + stubs
│   │       ├── page.tsx           # Redirect → /
│   │       ├── visitors/page.tsx  # Redirect → /visitors
│   │       ├── visits/page.tsx    # Redirect → /visits
│   │       ├── reception/page.tsx # Redirect → /reception
│   │       └── settings/page.tsx  # Settings hub (org, branches tab, flags)
│   ├── (kiosk)/
│   │   ├── layout.tsx             # Fullscreen kiosk shell (no AppShell)
│   │   └── kiosk/page.tsx         # Self-service kiosk (/kiosk)
│   ├── (auth)/
│   │   ├── layout.tsx             # Passthrough (no AppShell)
│   │   └── login/page.tsx         # Login page (/login)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── v1/                    # REST API (see §11)
│   ├── generated/prisma/          # Prisma client output
│   ├── layout.tsx                 # Root: fonts, SessionProvider, globals
│   └── globals.css                # Tailwind v4, light theme tokens
├── components/
│   ├── auth/                      # Login form (+ legacy org components)
│   ├── dashboard/                 # Dashboard widgets (server + client)
│   ├── data-table/                # Reusable table + pagination
│   ├── forms/                     # Form field wrapper
│   ├── layout/                    # App shell, sidebar, header
│   ├── providers/                 # AuthSessionProvider
│   ├── shared/                    # empty-state, error-state, loading-state
│   ├── ui/                        # button, input, card, badge, modal, drawer
│   ├── visitors/                  # Visitors module UI
│   ├── visits/                    # Visits list, Schedule Visit, badge/QR modals
│   ├── reception/                 # Staff reception operational console (Phase 3)
│   ├── search/                    # Unified operator search panel
│   ├── settings/                  # Branch management + operational policies UI
│   └── kiosk/                     # Self-service kiosk flows
├── hooks/
│   ├── use-quick-actions.ts       # Dashboard quick-action stubs
│   └── use-kiosk-inactivity.ts    # 60s idle → home (kiosk)
├── lib/
│   ├── api/                       # Frontend fetch wrappers + backend helpers
│   ├── auth/                      # NextAuth, session, password, request-ip
│   ├── dashboard/                 # get-dashboard-data.ts (server)
│   ├── tenant/                    # TenantContext, org resolution
│   ├── rbac/                      # Permissions + default roles
│   ├── services/                  # Domain services (backend)
│   ├── settings/                  # Resolver, defaults, feature flags
│   ├── validations/               # Zod schemas (shared with API)
│   ├── utils/cn.ts                # clsx + tailwind-merge
│   ├── audit/, devices/, db/, seed/
│   └── utils/crypto.ts
├── prisma/
├── middleware.ts                  # API auth + page route protection
├── types/next-auth.d.ts
└── docs/
```

---

## 13. Environment & Commands

### Required env (see `.env.example`)

```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
QR_SIGNING_SECRET
```

### Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run db:migrate       # Apply migrations
npm run db:seed          # Seed permissions, super admin, demo org
npm run db:reset         # Reset DB + seed
```

### Seeded credentials

- **Email:** `superadmin@entriss.local`
- **Password:** `Entriss!ChangeMe1` (or `SEED_SUPER_ADMIN_PASSWORD`)
- **Demo org slug:** `demo`

---

## 14. Frontend Architecture (Phases 1–7)

### 14.1 Development phases completed

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | App shell only — sidebar, header placeholders, responsive layout, static nav | ✅ |
| **2** | Auth UI + route protection + API client wrapper | ✅ |
| **3** | Dashboard with live API data (`GET /api/v1/visits`) | ✅ |
| **4** | Auth hardening — login fix, header email/sign-out, middleware pages | ✅ |
| **5** | Visitors module — table, search, pagination, drawer, create modal | ✅ |
| **6** | Visits module + reception console (Phase 3 operational console) | ✅ |
| **7** | Flow separation — Schedule Visit v1, kiosk shell, kiosk refinement (photo, docs, inactivity, result screens) | ✅ |
| **8** | Branch operational settings, branch management, kiosk `config.operational` enforcement, stabilization | ✅ |
| **9 (Step 2)** | Schedule Visit restructure — dual-path (existing vs new visitor), host/branch UX fixes, visit-first labeling | ✅ |
| **9 (Step 3)** | Frontend identity detachment — `lib/visits/detach.ts`, immutable state, API boundary clones | ✅ |
| **9 (identity)** | Visitor identity resolution UI + non-destructive create/reuse branching | 🟡 Approved; not implemented |

### 14.2 Routing structure

Next.js App Router with **route groups** (parentheses do not affect URL):

| URL | File | Layout | Renders |
|-----|------|--------|---------|
| `/login` | `app/(auth)/login/page.tsx` | `(auth)/layout` — no shell | Login form |
| `/` | `app/(app)/page.tsx` | `(app)/layout` — AppShell | Dashboard |
| `/visitors` | `app/(app)/visitors/page.tsx` | `(app)/layout` | Visitors module |
| `/visits` | `app/(app)/visits/page.tsx` | `(app)/layout` | Visits list + actions |
| `/visits/new` | `app/(app)/visits/new/page.tsx` | `(app)/layout` | Schedule Visit (dual-path) |
| `/reception` | `app/(app)/reception/page.tsx` | `(app)/layout` | Staff reception console |
| `/kiosk` | `app/(kiosk)/kiosk/page.tsx` | `(kiosk)/layout` | Self-service kiosk (no sidebar) |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | `(app)/layout` | Redirect → `/` |
| `/dashboard/visitors` | `app/(app)/dashboard/visitors/page.tsx` | `(app)/layout` | Redirect → `/visitors` |
| `/dashboard/visits` | `app/(app)/dashboard/visits/page.tsx` | `(app)/layout` | Redirect → `/visits` |
| `/dashboard/reception` | `app/(app)/dashboard/reception/page.tsx` | `(app)/layout` | Redirect → `/reception` |
| `/dashboard/settings` | `app/(app)/dashboard/settings/page.tsx` | `(app)/layout` | Settings hub (org, branches tab → `/settings/branches`, flags) |
| `/settings/branches` | `app/(app)/settings/branches/page.tsx` | `(app)/layout` | Branch list + create |
| `/settings/branches/[branchId]` | `app/(app)/settings/branches/[branchId]/page.tsx` | `(app)/layout` | Branch info + operational policies |

**Sidebar nav** (`components/layout/sidebar.tsx`):

| Label | href |
|-------|------|
| Dashboard | `/` |
| Visitors | `/visitors` |
| Visits | `/visits` |
| Reception | `/reception` |
| Settings | `/dashboard/settings` |

**Note:** `/kiosk` is intentionally **not** in the sidebar — opened from reception header or direct URL on a dedicated tablet.

### 14.3 Route protection (two layers)

1. **`middleware.ts`** — matcher: `/api/v1/*`, `/`, `/visitors`, `/visits`, `/visits/*`, `/reception`, `/kiosk`, `/kiosk/*`, `/dashboard`, `/dashboard/*`, `/settings`, `/settings/*`
   - Unauthenticated → redirect to `/login?callbackUrl=…`
   - API without session → `{ success: false, error: { code: "UNAUTHORIZED" } }`
   - `/api/auth/*` is public
   - `/login` is **not** in matcher (always accessible)

2. **`app/(app)/layout.tsx`** — server component calls `getSessionUser()`; redirects to `/login` if no session. Wraps children in `AppShell` + `PageContainer`.

**Login flow:**
- `LoginForm` → `signIn("credentials", { email, password, redirect: false })`
- Success → `router.push(callbackUrl ?? "/")` + `router.refresh()`
- `(auth)/login/page.tsx` redirects authenticated users to `/`

### 14.4 Client vs server component strategy

| Pattern | Where | Why |
|---------|-------|-----|
| **Server Component** | `app/(app)/layout.tsx`, `(auth)/login/page.tsx`, `dashboard-content.tsx` | Session check, initial data fetch with cookies via `serverApiFetch` |
| **Client Component** | `VisitorsPage`, `LoginForm`, `HeaderAuth`, `AppShell`, modals/drawers | `useSession`, `useState`, `useEffect`, forms, interactivity |
| **Suspense** | Dashboard `page.tsx` | `DashboardSkeleton` while `DashboardContent` loads |
| **No Redux/Zustand** | — | Local `useState` + `useCallback` per page; refetch on user action |

**Critical rule:** Never import `lib/api/*.server.ts` or `lib/api/server-client.ts` from client components. Turbopack will fail the build (`next/headers` in client bundle).

Split pattern:
- `lib/api/visitors.ts` — browser-safe (`apiFetch`)
- `lib/api/visitors.server.ts` — `listVisitorsServer` for RSC only
- `lib/api/visits.ts` / `lib/api/visits.server.ts` — same split

### 14.5 Frontend API layer

**Base client:** `lib/api/client.ts`

```typescript
apiFetch<T>(path, { method?, body?, searchParams? })
// - credentials: "include" (session cookie)
// - parses { success, data } / { success, error }
// - throws ApiError on failure
```

**Server client:** `lib/api/server-client.ts` — forwards `cookie` header from `next/headers` for RSC → internal API calls.

| File | Functions | Used by |
|------|-----------|---------|
| `lib/api/visitors.ts` | `listVisitors`, `createVisitor`, `fetchVisitorVisitStats`, `enrichVisitorsWithVisitStats` | Visitors page (client) |
| `lib/api/visitors.server.ts` | `listVisitorsServer` | (reserved for RSC visitors) |
| `lib/api/visits.ts` | `listVisits`, `getVisit`, `registerVisit`, `searchVisits`, `checkInVisit`, `checkOutVisit`, `checkInWithQrToken`, `checkOutWithQrToken`, `generateVisitQR`, `getVisitBadge`, `getVisitBadgeA4` | Visits, reception, kiosk (client) |
| `lib/api/visits.server.ts` | `listVisitsServer` | `lib/dashboard/get-dashboard-data.ts` (server) |
| `lib/api/organizations.ts` | `getOrganizations`, `switchOrganization` | Ready; org switcher not wired |
| `lib/visits/branches.ts` | `loadBranchOptions`, `extractBranchesFromVisits` | Visits list filters, kiosk register (Schedule Visit uses `lib/api/branches.ts` directly) |
| `lib/visits/hosts.ts` | `loadHostOptions`, `extractHostsFromVisits` | Admin host override on Schedule Visit (`user:manage` only); kiosk still uses session host |
| `lib/visits/search-visits.ts` | `searchVisitsByVisitor` | Visits list text search |
| `lib/visits/actions.ts` | `canCheckInVisit`, `canCheckOutVisit`, etc. | Visit action gating |
| `lib/visits/types.ts` | Shared visit/badge/register types | Frontend modules |

**No Prisma in frontend.** All data via `/api/v1/*`.

### 14.6 App shell & layout components

| File | Type | Role |
|------|------|------|
| `components/layout/app-shell.tsx` | Client | `h-screen` flex; desktop sidebar + mobile overlay nav |
| `components/layout/sidebar.tsx` | Client | Static nav links; active state via `usePathname()` |
| `components/layout/header.tsx` | Client | Mobile menu button, org switcher placeholder, notifications placeholder, `HeaderAuth` |
| `components/layout/header-auth.tsx` | Client | `useSession()` → email + Sign out (`signOut({ callbackUrl: "/login" })`) |
| `components/layout/org-switcher.tsx` | Client | **Placeholder** — shows `activeOrganization.name` from session; disabled button (no switch logic) |
| `components/layout/notifications.tsx` | Client | **Placeholder** — bell icon with dot |
| `components/layout/user-menu.tsx` | Client | **Legacy/unused** — replaced by `HeaderAuth` |
| `components/providers/session-provider.tsx` | Client | Wraps app in NextAuth `SessionProvider` |
| `app/layout.tsx` | Server | Root HTML, Geist fonts, `AuthSessionProvider` |

**Design:** Light theme, zinc palette, enterprise SaaS density. `PageContainer` = `max-w-7xl` centered content padding.

### 14.7 Auth UI files

| File | Role |
|------|------|
| `components/auth/login-form.tsx` | Email/password form, loading + error states, `signIn("credentials")` |
| `app/(auth)/login/page.tsx` | Server page; redirects if already logged in |
| `components/auth/org-required.tsx` | **Exists but unused** — org picker for users without `activeOrganizationId` |
| `components/auth/org-switcher.tsx` | **Legacy** — API-wired switcher; not used in current header |
| `lib/auth/request-ip.ts` | Safe IP extraction for rate limiting in `authorize()` |

### 14.8 Dashboard module (`/`)

**Entry:** `app/(app)/page.tsx` → `<Suspense><DashboardContent /></Suspense>`

| File | Role |
|------|------|
| `components/dashboard/dashboard-content.tsx` | **Server** — fetches stats via `getDashboardData()` |
| `lib/dashboard/get-dashboard-data.ts` | Parallel `listVisitsServer` calls (today, checked-in, pending, week, recent) |
| `components/dashboard/stats-cards.tsx` | 4 stat cards |
| `components/dashboard/recent-visits-table.tsx` | Full-width recent visits table |
| `components/dashboard/checked-in-panel.tsx` | Checked-in visitors list |
| `components/dashboard/quick-actions.tsx` | Client buttons with stub handlers |
| `components/dashboard/dashboard-skeleton.tsx` | Loading skeleton |
| `hooks/use-quick-actions.ts` | `console.info` stubs for register/check-in/search |

**Dashboard API usage (no dedicated stats endpoint):**

| Stat | Query |
|------|-------|
| Visits today | `dateFrom` + `dateTo` = today, `limit: 1` → `pagination.total` |
| Checked in | `status=CHECKED_IN`, `limit: 1` → `pagination.total` |
| Pending approvals | `status=AWAITING_APPROVAL`, `limit: 1` → `pagination.total` |
| Visits this week | Monday–now date range, `limit: 1` → `pagination.total` |
| Recent visits table | `limit: 10` (no status filter) |
| Checked-in panel | `status=CHECKED_IN`, `limit: 8` |

### 14.9 Visitors module (`/visitors`)

**Entry:** `app/(app)/visitors/page.tsx` → `<VisitorsPage />` (client)

| File | Role |
|------|------|
| `components/visitors/visitors-page.tsx` | Main orchestrator: search, pagination, fetch, modals |
| `components/visitors/visitors-table.tsx` | Column defs + row click |
| `components/visitors/visitor-profile-drawer.tsx` | Side drawer; loads `listVisits({ visitorId, limit: 10 })` |
| `components/visitors/create-visitor-modal.tsx` | Profile-only modal (“Visitor information”) → `POST /api/v1/visitors` |
| `components/visitors/schemas.ts` | Client form schema (email OR phone required) |

**UI labeling (Phase 9):** Visit scheduling lives at `/visits/new`; visitors page empty state reads “Schedule a visit to register a visitor entry.” Profile drawer section: **Visitor information**.

**Table columns:** Name, Email, Phone, Company, Visits (count), Last visit, Status (Active/Inactive from `isActive`), Actions (View).

**Visit stats enrichment:** Visitors API does not return visit count/last visit. After list loads, `enrichVisitorsWithVisitStats()` calls `GET /api/v1/visits?visitorId={id}&limit=1` per row (parallel) and uses `pagination.total` + latest visit timestamp.

**Search:** Debounced 300ms → `?search=` query param on `GET /api/v1/visitors`. Resets to page 1.

**Pagination:** `PAGE_SIZE = 25`, `offset = (page - 1) * 25`. Controls in `DataTablePagination`.

**Create visitor:** `POST /api/v1/visitors` — explicit create via `createVisitorForStaff` with optional `forceCreateVisitor`; identity resolution UI precedes mutation. `getOrCreateVisitor` deprecated for runtime. Frontend detaches API responses via `lib/visits/detach.ts`.

**No `GET /api/v1/visitors/[id]`** — drawer uses row data + visits list.

### 14.10 Visits module (`/visits`, `/visits/new`)

**List entry:** `app/(app)/visits/page.tsx` → `<VisitsPage />`

| File | Role |
|------|------|
| `components/visits/visits-page.tsx` | List orchestrator: filters, search, pagination, actions |
| `components/visits/visits-table.tsx` | Columns + row actions (check-in/out, QR, badge) |
| `components/visits/visits-filters.tsx` | Status, branch, date filters |
| `components/visits/visit-details-drawer.tsx` | Visit detail — tabbed (`max-w-6xl`): Overview, Approval, Check-In Details, Audit |
| `components/visits/visit-details-checkin-tab.tsx` | Check-in media, badge, QR display |
| `components/visits/visit-approval-panel.tsx` | Approval config, history, actions (Visit Details) |
| `components/approvals/approvals-page.tsx` | Legacy approval queue (deprecated banner; manual refresh) |
| `components/visits/qr-code-modal.tsx` | QR display/generate (`qrcode` npm) |
| `components/visits/badge-preview-modal.tsx` | Thermal badge primary; A4 toggle optional |
| `components/visits/thermal-badge-preview.tsx` | Thermal layout renderer |
| `components/visits/new-visit-page.tsx` | Schedule Visit page shell + confirmation handoff |
| `components/visits/new-visit-form.tsx` | Dual-path scheduler: mode selector, existing-visitor search, new-visitor inline form, visit details |
| `components/visits/visit-confirmation.tsx` | Post-schedule confirmation + QR |

**Schedule Visit (`/visits/new`):** **No auto check-in.**

| Mode | Flow |
|------|------|
| **Existing visitor** | `GET /api/v1/visitors?search=` → select → `POST /api/v1/visits` with `visitorId` |
| **New visitor** | `POST /api/v1/visitors` → `POST /api/v1/visits` with returned `visitorId` |

**Host:** `session.user.memberId` → `hostMemberId` (read-only badge; admins with `user:manage` may override). **Branches:** `GET /api/v1/branches` only (never visit-derived lists). Shows status + QR when `APPROVED`.

### 14.11 Reception console (`/reception`)

**Entry:** `app/(app)/reception/page.tsx` → `<ReceptionConsole />` → `ReceptionConsoleShell`

**Architecture (Phase 3.6):** Four workspaces + contextual overlays. Full-width layout; QR scanner is on-demand (drawer), not permanently mounted.

| Workspace | Component | Contents |
|-----------|-----------|----------|
| **Command Center** (default) | `reception-command-center.tsx` | Metrics, operational queues, recent visitors, fast actions |
| **Search** | `unified-search-panel.tsx` | Unified search only — visitors, visits, checked-in + visit actions |
| **Operations** | `reception-operations-workspace.tsx` | Rescue queue, duplicate review, override guidance |
| **Activity** | `live-activity-panel.tsx` | Activity stream, on-site visitors, today metrics |

| Overlay / chrome | File | Role |
|------------------|------|------|
| Shell + routing | `reception-console-shell.tsx` | Workspace state, visit/visitor drawers, modals |
| Action bar | `reception-action-bar.tsx` | Scan QR, New walk-in, Search, Pending approvals, Print badge |
| Workspace nav | `reception-workspace-nav.tsx` | Command / Search / Operations / Activity tabs |
| QR drawer | `qr-scanner-drawer.tsx` | Wraps `qr-scanner-panel.tsx` (embedded mode) |
| QR scanner | `qr-scanner-panel.tsx` | Staff QR check-in/out, capture, approval flows |
| Rescue | `visitor-rescue-panel.tsx` | Failed kiosk + abandoned registrations |
| Recent visitors | `recent-visitors-panel.tsx` | Last 20 active visitors |
| Duplicates | `duplicate-review-panel.tsx` | Possible duplicate groups (Operations workspace) |
| Overrides | `visit-override-modal.tsx` | Force check-in/out with reason |
| Quick actions | `reception-visit-quick-actions.tsx` | Shared Check in / out / 360 / Visit / Badge buttons |
| Activity stream | `live-activity-stream.tsx` | Feed rows |
| Fast actions (command) | `reception-command-fast-actions.tsx` | Scan / walk-in / search strip on command center |

**APIs consumed:** `GET /api/v1/reception/dashboard`, `GET /api/v1/reception/recent-visitors`, `GET /api/v1/search/unified`, `GET /api/v1/visitors/duplicates`, visit check-in/out/force/cancel, Visitor 360 + activity endpoints.

**Staff actions in header:** Schedule visit → `/visits/new`, Open kiosk → `/kiosk`.

**Legacy / unused in shell:** `reception-fast-actions.tsx` (superseded by action bar), `reception-manual-lookup.tsx` (superseded by unified search), `quick-register.tsx` (use `/kiosk`).

### 14.12 Shared / reusable UI components

| Path | Exports | Reuse for |
|------|---------|-----------|
| `components/data-table/data-table.tsx` | `DataTable`, `DataTableColumn<T>` | Any tabular list |
| `components/data-table/pagination.tsx` | `DataTablePagination` | Offset-based pagination |
| `components/shared/empty-state.tsx` | `EmptyState` | Zero-result states |
| `components/shared/error-state.tsx` | `ErrorState` | API errors + retry |
| `components/shared/loading-state.tsx` | `LoadingState`, `TableSkeleton` | Loading UX |
| `components/forms/form-field.tsx` | `FormField` | Label + input + error |
| `components/ui/button.tsx` | `Button` | Primary/secondary/ghost/danger |
| `components/ui/input.tsx` | `Input` | Text inputs |
| `components/ui/card.tsx` | `Card`, `CardHeader`, `CardContent`, `CardTitle` | Panels |
| `components/ui/badge.tsx` | `StatusBadge` | Visit status chips |
| `components/ui/modal.tsx` | `Modal` | Centered dialogs |
| `components/ui/drawer.tsx` | `Drawer` | Right-side panels |
| `components/ui/label.tsx` | `Label` | Form labels |
| `components/icons.tsx` | SVG icons (Dashboard, Users, Menu, Bell, etc.) | Nav + actions |
| `lib/utils/cn.ts` | `cn()` | Tailwind class merging |

### 14.13 Reusable patterns (copy for next modules)

1. **Page shell:** Thin `app/(app)/{module}/page.tsx` imports one client `*Page` component.
2. **Data fetching (client pages):** `useCallback` loader + `useEffect`; handle `ApiError` for messages.
3. **Data fetching (server pages):** `*Content` server component + `*Server` API helpers + `Suspense` skeleton.
4. **Forms:** `react-hook-form` + `zodResolver` + `FormField` + `ApiError` catch on submit.
5. **Tables:** Define `DataTableColumn<T>[]` in module-specific `*-table.tsx`.
6. **Drawers/modals:** Controlled via `open` + `onClose` props; reset form on close.
7. **API types:** Co-locate response interfaces in `lib/api/{resource}.ts`; import in components.
8. **Redirects:** Keep legacy `/dashboard/*` paths as `redirect()` for bookmark compatibility.

### 14.14 Frontend files inventory (UI — key routes)

**App routes**
- `app/(app)/layout.tsx`
- `app/(app)/page.tsx`
- `app/(app)/visitors/page.tsx`
- `app/(app)/visits/page.tsx`, `app/(app)/visits/new/page.tsx`
- `app/(app)/reception/page.tsx`
- `app/(kiosk)/layout.tsx`, `app/(kiosk)/kiosk/page.tsx`
- `app/(app)/dashboard/page.tsx` (redirect)
- `app/(app)/dashboard/visitors/page.tsx` (redirect → `/visitors`)
- `app/(app)/dashboard/visits/page.tsx` (redirect → `/visits`)
- `app/(app)/dashboard/reception/page.tsx` (redirect → `/reception`)
- `app/(app)/dashboard/settings/page.tsx` (stub)
- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/layout.tsx` (SessionProvider, metadata)
- `app/globals.css` (light theme)

**Components** — see §14.6–14.12, §14.17 for module lists under `components/`.

**Lib / hooks**
- `lib/api/client.ts`, `server-client.ts`
- `lib/api/visitors.ts`, `visitors.server.ts`
- `lib/api/visits.ts`, `visits.server.ts`
- `lib/api/organizations.ts`
- `lib/visits/*` — branches, hosts, actions, timeline, types, search, name, **detach**
- `lib/dashboard/get-dashboard-data.ts`
- `lib/auth/request-ip.ts`
- `lib/utils/cn.ts`
- `hooks/use-quick-actions.ts`, `hooks/use-kiosk-inactivity.ts`, `hooks/use-kiosk-lockdown.ts`
- `lib/kiosk/camera.ts`, `lib/api/settings.ts`, `lib/api/branches.ts`
- `lib/settings/branch-operational.ts`, `lib/validations/branch-operational-settings.ts`

**Config**
- `middleware.ts` — matchers include `/visits`, `/reception`, `/kiosk`
- `package.json` — `react-hook-form`, `@hookform/resolvers`, `html5-qrcode`, `qrcode`

### 14.15 Frontend progress

Canonical status: **§0 FRONTEND STATUS**.

| Feature | Status |
|---------|--------|
| Auth flow | ✅ |
| Dashboard | ✅ |
| Visitors module | ✅ |
| Visits module | ✅ |
| Reception console | ✅ |
| Schedule Visit flow (`/visits/new`) — dual-path | ✅ |
| Frontend visitor/visit detachment | ✅ `lib/visits/detach.ts` |
| Visitor identity resolution (staff) | ❌ Approved direction |
| Kiosk system | ✅ |
| Shared kiosk UX system | ✅ |
| Unified visitor lifecycle UX | ✅ |
| Badge preview (browser print) | ✅ |
| Settings (org/flags) | 🟡 Partial at `/dashboard/settings` |
| Branch management | ✅ `/settings/branches` (canonical branch APIs) |
| Branch operational policies UI | ✅ Editable; **kiosk enforces**; staff scheduling does not |
| Notifications | 🟡 Stub |
| Reports / analytics | ❌ |
| Org management UI | 🟡 Stub |
| Permissions / roles UI | ❌ |
| File upload persistence | ❌ |
| Real badge printer integration | ❌ |
| Visitor photos/documents backend storage | ❌ |

### 14.16 Reception architecture (flow separation)

> **Clarification:** Reception and kiosk are **separate products/pages**, not separate runtime architectures. Shared backend; kiosk uses Resolve → Confirm → Execute → Result; reception is staff-assisted operational density with a **four-workspace console** (Phase 3.6).

Three distinct experiences — do not mix staff ops, scheduling, and self-service on one screen.

#### 1. `/reception` — Staff operational control center

**Who:** Receptionists, security, front desk staff (authenticated, AppShell).

**Purpose:** Real-time operational awareness, unified lookup, exception handling, QR-assisted check-in/out, visitor intelligence access.

**Workspaces:**

| Tab | Purpose |
|-----|---------|
| **Command Center** | Metrics, approval/expected/checked-in/overdue queues, recent visitors |
| **Search** | Unified operator search (visitors, visits, checked-in) |
| **Operations** | Kiosk rescue, duplicate review, override guidance |
| **Activity** | Live activity stream + on-site list |

**Global chrome:** Permission-aware action bar (Scan QR, New walk-in, Search, Pending approvals, Print badge).

**Contextual overlays:** QR scanner drawer, Visitor 360 drawer, Visit details drawer, badge preview, override modal.

| Capability | Status | API / surface |
|------------|--------|---------------|
| Unified operator search | ✅ | `GET /api/v1/search/unified` |
| Command center dashboard | ✅ | `GET /api/v1/reception/dashboard` |
| Recent visitors | ✅ | `GET /api/v1/reception/recent-visitors` |
| Duplicate review (visibility) | ✅ | `GET /api/v1/visitors/duplicates` |
| Force check-in/out | ✅ | Admin/Security only; `POST .../force-check-in`, `force-check-out` |
| QR scan check-in/out | ✅ | On-demand drawer; `qr-scanner-panel` → check-in/out APIs |
| Live activity | ✅ | Activity workspace; `fetchLiveActivityFeed()` + visit lists |
| Visitor 360 | ✅ | Contextual drawer from all workspaces |
| Kiosk rescue | ✅ | Operations workspace |
| Schedule visit entry | ✅ Link | `/visits/new` |
| Open kiosk | ✅ Link | `/kiosk` (tablet) |
| Walk-in register | ✅ Link | `/kiosk` (action bar + command fast actions) |
| Legacy manual lookup stub | ❌ Superseded | Use Search workspace |

**Real-world usage:** Staff workstation at the desk. Default view is Command Center for "what needs attention now." Search for lookups; Operations for exceptions; Activity for history. QR launched only when scanning.

#### 2. `/visits/new` — Schedule Visit (dual-path)

**Who:** Staff scheduling visits in advance (authenticated, AppShell).

**Purpose:** Create visit records for expected visitors — **without auto check-in**. UI is **visit-first** with explicit mode selection.

| Mode | UI | APIs |
|------|-----|------|
| **Existing visitor** | Searchable dropdown + preview card | `GET /api/v1/visitors?search=` → `POST /api/v1/visits` (`visitorId`) |
| **New visitor** | Compact inline identity form | `POST /api/v1/visitors` → `POST /api/v1/visits` |

| Visit fields (both modes) | `branchId`, `hostMemberId` (session), `purpose`, `scheduledAt` — all required |

**Flow:** confirmation with status badge → QR when `APPROVED`. Respects `requiresApproval` per branch (may land in `PENDING` / `AWAITING_APPROVAL`).

**Real-world usage:** EA or receptionist books a meeting visitor before arrival. Visitor receives QR (future: email). On arrival, QR scan at reception or kiosk completes check-in.

#### 3. `/kiosk` — Self-service terminal

**Who:** Visitors at a lobby tablet (authenticated session on device — org context from logged-in kiosk account).

**Purpose:** Visitor-facing fullscreen UX — no sidebar, touch-first, auto-reset on idle.

| Flow | Behavior |
|------|----------|
| Scan invitation QR | Scan → resolve visit → **confirm** check-in or check-out → execute → result + badge |
| Find my booking | Search → select visit → **confirm** check-in/out → execute → result |
| Register as new visitor | Details → identity → capture → review → register + check-in → approval-pending (if required) → badge → result |

**Real-world usage:** Unattended iPad in lobby. Visitor taps option, completes flow, sees full-screen success. Returns to home after 60s idle or when done.

### 14.17 Kiosk architecture

**Canonical documentation:** **§0** (KIOSK ARCHITECTURE, QR FLOW, BOOKING FLOW, REGISTRATION FLOW, SHARED KIOSK COMPONENTS, UI SYSTEM).

> One unified visitor management experience with **responsive density only** — no device-mode, reception-mode, or tablet behavioral branching.

#### Route group

- `app/(kiosk)/layout.tsx` — `fixed inset-0` fullscreen shell; session guard; **no AppShell/sidebar**
- `app/(kiosk)/kiosk/page.tsx` → `<KioskShell />`

#### Shell

| File | Role |
|------|------|
| `kiosk-shell.tsx` | Screen router: `home` \| `qr` \| `booking` \| `register`; 60s inactivity → home |
| `kiosk-home.tsx` | Entry CTAs |
| `kiosk-header.tsx` | Back-to-home |
| `kiosk-flow-frame.tsx` | Header + scrollable main (`kioskFlowMain`, `kioskFlowWide`) |

#### Shared components (centralized — not duplicated per flow)

- `kiosk-confirm-card.tsx` — `KioskVisitConfirmCard`, `KioskRegistrationReviewCard`, `KioskConfirmOverlay`
- `kiosk-resolving-hint.tsx` — `KioskResolvingOverlay` (“Resolving…”), `KioskResolvingHint`
- `kiosk-result-screen.tsx` — all flows
- `kiosk-ui.ts` — responsive tokens + timing constants
- `lib/kiosk/visit-display.ts` — visitor/host/meta formatters

#### Inactivity

- `hooks/use-kiosk-inactivity.ts` — 60s idle on non-home screens → home

#### History

- **2026-06-08:** Kiosk home, booking search, 4-step register, camera helpers
- **2026-06-09:** Unified Resolve → Confirm → Execute → Result; shared confirm/result components; responsive `kiosk-ui` tokens only (device-mode approaches removed / never shipped)
- **2026-06-09 (Phase 8):** Branch operational settings foundation (`config.operational`), branch management APIs + `/settings/branches` UI, kiosk operational enforcement, permission/Prisma stabilization
- **2026-06-09 (Phase 9 Step 2):** Schedule Visit restructure — existing vs new visitor modes, visit-first UX, host read-only from session, branches from `/api/v1/branches`, dropdown state fixes; `docs/product-model.md` added
- **2026-06-09 (Phase 9 Step 3):** Frontend identity detachment — `lib/visits/detach.ts`, API boundary clones, immutable visitor/visit state; visitor list + action dropdown fixes
- **2026-06-09 (Phase 9 direction):** Visitor identity safety approved — resolve (read-only) → operator decision (use existing / create separate / cancel); remove silent `getOrCreateVisitor` merge from staff flows
- **2026-06-10 (Phase 9 complete):** Unified Visit Engine wired across kiosk/staff; visitor identity resolution implemented; kiosk booking flow complete (identity → capture → badge → result); thermal badge-only print isolation; QR policy scoped to QR flow; fullscreen auto-trigger removed
- **2026-06-10 (Phase 9 QR):** Kiosk QR flow rebuilt — booking parity pipeline inside `KioskFlowFrame`; `kiosk-qr-scanner.tsx` + recover panels; shared identity/capture/badge; recoverable failures only

**Design reference:** `docs/KIOSK-INTERACTION-STANDARD.md`

### 14.18 Frontend NOT built yet

See **§0 KNOWN LIMITATIONS** and **§0 FRONTEND STATUS** (incomplete/stub). Summary:

| Area | Notes |
|------|-------|
| **Settings** | Org/flags partial; branch ops at `/settings/branches/*`; kiosk enforces operational policies |
| **Visitor identity resolution** | **Implemented** — staff + kiosk register; see **§0 PHASE 9 IDENTITY RESOLUTION** |
| **Resilience layer** | ✅ Phase 1.5B complete — retry, timeout, camera recovery, poll failure UX |
| **Notifications** | Placeholder bell; no email/SMS |
| **Reports / analytics** | **Built** — `/analytics`; dashboard, branch/host, audit, exports; snapshot engine (Phase 5) |
| **Org management** | Switcher placeholder only |
| **Permissions / roles UI** | Session has `permissions[]`; UI not gated |
| **File upload persistence** | No storage API |
| **Real badge printer** | Browser print only |
| **Visitor photos/documents** | Persisted on check-in (visitor + `check_in.capture` event); blob/S3 not implemented |
| **Reception manual lookup** | **Superseded** — Phase 3.1 unified search (`components/search/unified-search-panel.tsx`) |
| **QR fallback routing** | `kiosk-shell` does not wire booking/register from QR fallbacks |
| **Tests** | No frontend tests |

---

## 15. Recommended Next Steps

**Canonical list:** **PHASE 1–3, 5 COMPLETION SNAPSHOTS** — Phases 4, 6–8 below.

### Phase 2 — Visitor lifecycle completeness ✅ COMPLETE

See **PHASE 2 COMPLETION SNAPSHOT** (Phases 2.1–2.5B): timeline, activity stream, insights, notes/tags, Visitor 360, stabilization.

### Phase 3 — Operator & reception tooling ✅ COMPLETE

See **PHASE 3 COMPLETION SNAPSHOT** (Phases 3.1–3.6):

- 3.1 Unified operator search
- 3.2 Command center + visitor rescue flows
- 3.3 Manual overrides (force check-in/out)
- 3.4 Duplicate detection visibility
- 3.5 Recent visitors + last visit productivity
- 3.6 Reception IA refactor (four workspaces, action bar, QR drawer)

~~Audit log read API + UI~~ — unified activity stream + Activity Viewer shipped in Phase 2.2; dedicated audit admin UI remains optional future work.

### Phase 5 — Reporting & analytics ✅ COMPLETE

See **PHASE 5 COMPLETION SNAPSHOT** (Phases 5.1–5.6B):

- 5.1 Dashboard analytics (KPIs, trends, status breakdown)
- 5.2 Branch analytics (traffic, heatmap, 30-day trends)
- 5.3 Host analytics (leaderboard, duration)
- 5.4 Export system (CSV, Excel, PDF)
- 5.5 Audit reporting (compliance, security, activity stream reuse)
- 5.6A Query layer + cache hardening
- 5.6B Snapshot engine (`AnalyticsSnapshot` table, cron scheduler)

### Phase 4 — Media storage infrastructure

- Upload pipeline (S3 or equivalent); stop inline base64 in Postgres
- Presign / blob storage APIs

### Phase 6 — Notifications & workflow completion

- Email/SMS providers; wire header bell
- Notification delivery enforcement

### Phase 7 — Enterprise policies

- Permission-aware UI gating
- Advanced org/branch policy surfaces

### Phase 8 — Branding & product polish

- UI consistency, onboarding, enterprise branding

### Engineering hygiene (ongoing)

- Tests: visit transitions, QR verify, policy resolver, recovery flows
- Permission-aware UI gating

### Deferred / historical (Phase 10.2 items)

- Register review screen removal
- Register capture skip when media exists
- Visit drawer width polish

---

## 16. Design Rules (carry forward)

### Backend

1. **No Prisma in route handlers** — services only.
2. **Every service method takes `TenantContext` first.**
3. **No hardcoded business rules** — use `resolveBranchConfig` / `resolveOrganizationConfig`.
4. **Badge printer is primary; A4 is explicit opt-in only.**
5. **QR tokens are server-signed** — `verifyVisitQR` on `POST /api/v1/visits/qr/resolve`; all scan surfaces use server verify (Phase 1.2).
6. **Audit + VisitEvent on all mutating visitor/visit operations.**
7. **Feature flags default to `false` when unset** (except seeded defaults on org create).

### Frontend

8. **No Prisma in frontend** — use `lib/api/*` wrappers only.
9. **Never import `*.server.ts` API modules from client components.**
10. **Respect API envelope** — `{ success, data }` / `{ success, error }`; catch `ApiError`.
11. **Org context is automatic** — session cookie + middleware; no manual `organizationId` in fetch.
12. **Keep pages thin** — orchestration in `components/{module}/*-page.tsx`.
13. **Do not redesign auth** — NextAuth JWT + existing org-switch API; wire UI only.
14. **Light theme first** — enterprise SaaS density; no dark-only UI.
15. **Thermal badge remains primary** — `GET /api/v1/visits/[id]/badge`; A4 only via `?format=a4` explicit opt-in (admin modals only; not kiosk).
16. **Kiosk is touch-first** — fullscreen `(kiosk)` route group, large CTAs, full-screen result states, 60s inactivity reset.
17. **Reception is staff-first** — four-workspace operational console (Command, Search, Operations, Activity); permission-aware action bar; QR on-demand drawer; Visitor 360 contextual; no permanent QR side panel.
18. **Avoid modal stacking in kiosk flows** — use full-screen `KioskResultScreen` and confirm cards; no modals.
19. **Multi-step UX over giant forms** — kiosk home → flow → confirm → result; Schedule Visit mode selector → visit details → confirmation.
20. **Shared components before duplication** — `DataTable`, `FormField`, `ThermalBadgePreview`, `StatusBadge`, `KioskResultScreen`, `lib/visits/*` helpers.
21. **APIs only through fetch wrappers** — `apiFetch` / `lib/api/*.ts`; never call Prisma or services from components.
22. **Kiosk global interaction model** — **Resolve → Confirm → Execute → Result** on every flow (QR, booking, register). No mutations during resolve. No auto check-in on scan or registration.
23. **Kiosk confirm before mutate** — scan/search/intake only prepares data; user must explicitly confirm before `checkInVisit`, `checkOutVisit`, or `registerVisit`.
24. **One kiosk product, responsive CSS only** — no runtime device-mode, reception-mode, or tablet behavioral branching; use `kiosk-ui.ts` Tailwind tokens (`lg:` scaling).

---

## 17. Current product state (2026-06-18)

**Platform maturity (code truth):** Functional VMS **core** with Phase 1 policy/resilience hardening, **Phase 2 visitor lifecycle** (timeline, activity, insights, notes/tags, Visitor 360), **Phase 3 operator tooling** (unified search, command center, rescue, duplicates, overrides, reception IA), and **Phase 5 reporting & analytics** (management dashboard, branch/host analytics, audit reports, exports, snapshot engine). Media remains inline base64; enterprise notifications not yet implemented.

**What works end-to-end today:**

1. Staff auth + multi-tenant RBAC
2. Visitor CRUD + identity resolution (register path)
3. Schedule visit + pre-visit approval (staff Visit Details)
4. Kiosk QR/booking check-in for **APPROVED** visits (with capture when required)
5. Kiosk walk-in registration + approval poll
6. Reception QR check-in/out (on-demand drawer; capture + approval flows)
7. Reception manual check-in for **APPROVED** visits (search + queues + visit actions)
8. Badge generation + thermal print (browser)
9. Visit timeline + check-in media display in Visit Details
10. Visitor timeline API + panel (Phase 2.1)
11. Unified activity stream — VisitEvent + AuditLog (Phase 2.2)
12. Visitor insights — type, frequency, favorites (Phase 2.3)
13. Visitor notes & operational tags (Phase 2.4)
14. Visitor 360 drawer — Overview, Identity, Timeline, Activity, Insights, Notes (Phase 2.5)
15. **Unified operator search** (Phase 3.1)
16. **Reception command center + rescue flows** (Phase 3.2)
17. **Force check-in/out overrides** — Admin/Security (Phase 3.3)
18. **Duplicate detection visibility** (Phase 3.4)
19. **Recent visitors + last visit productivity** (Phase 3.5)
20. **Reception four-workspace IA** — Command / Search / Operations / Activity (Phase 3.6)
21. **Analytics intelligence layer** — `/analytics` dashboard, branch/host analytics, audit reports, CSV/Excel/PDF exports (Phase 5)

**Known gaps (Phases 4, 6–8):**

- No object storage (inline base64 media)
- Outbound email/SMS not wired; header bell inactive
- Permission-aware UI gating incomplete (Reception action bar is partially gated)
- Watchlist/blacklist **not enforced** (tags are visual/memory only)
- Kiosk requires staff login (not unattended device auth)
- No duplicate **merge** workflow (visibility only in Phase 3.4)

**Recent delivery (2026-06-17):**

- Phase 3.1–3.6 operator & reception tooling stack
- Reception IA refactor — workspaces, action bar, QR drawer

**Next phase:** **Phase 6 — Notifications & Workflow Completion** (see **PHASE 5 COMPLETION SNAPSHOT** and §15). Phase 4 (media storage) remains parallel infrastructure work.

---

*For deeper design rationale, see `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, and `docs/product-model.md`.*
