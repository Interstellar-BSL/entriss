# Next Actions — Post Phase 6.18 Baseline

**Date:** 2026-06-17  
**Baseline:** `PHASE_6_18_BASELINE`  
**Purpose:** Prioritized remaining work after stable Phase 6.18 checkpoint

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed in baseline |
| 🟡 | Partially complete |
| ⏳ | Not started |
| 🚫 | Explicitly excluded from current scope |

---

## 1. UI / Theme (Phases 6.17–6.18 follow-up)

| Item | Status | Notes |
|------|--------|-------|
| Reception KPI card token styling | ✅ | `reception-command-center.tsx`, `live-activity-panel.tsx` |
| Analytics KPI card token styling | ✅ | `analytics-dashboard.tsx` `MetricCard` |
| Kiosk button/theme completion | ✅ | `kiosk-ui.ts` + 26-file kiosk patch |
| Reception primary action buttons | ✅ | Check-in / approve use `variant="primary"` |
| App-wide color token audit (non-kiosk) | ✅ | Phase 6.17 bulk patch |
| Badge printing UI theming | 🚫 | Excluded — print surfaces use fixed colors |
| QR debug panel theming | 🚫 | `kiosk-qr-debug-panel.tsx` — dev-only |
| Login page org white-label | ⏳ | Still Entriss platform branding only |
| Email template theming | 🚫 | Inline HTML; client compatibility |

### Remaining color token audit (low priority)

- [ ] Optional pass on `kiosk-badge-panel.tsx`, `kiosk-badge-details-panel.tsx`, `kiosk-inline-badge.tsx` if product wants print preview themed
- [ ] Semantic status colors (amber/red/emerald info banners) — intentional; review for consistency only
- [ ] `reception-visit-quick-actions.tsx` force override buttons — amber semantic styling retained

---

## 2. Loader / UX Improvement Phase

| Item | Status | Notes |
|------|--------|-------|
| Global loading progress bar | ✅ | Phase 6.14 `GlobalLoadingProvider` |
| GET request deduplication | ✅ | `lib/api/in-flight.ts` |
| Button loading states | ✅ | `Button` `loading` prop |
| Action locks (approvals, reception, visits) | ✅ | Phase 6.14 extensions |
| Route-level skeleton (`app/(app)/loading.tsx`) | ✅ | Present |
| Skeleton coverage audit (all heavy pages) | 🟡 | Dashboard/reception covered; expand as needed |
| Optimistic UI for check-in | ⏳ | Not implemented |
| Toast / inline feedback standardization | 🟡 | Mixed patterns across flows |

---

## 3. White-Label Login Page Investigation

| Item | Status | Notes |
|------|--------|-------|
| Org logo on login | ⏳ | Currently `PlatformLogo` only |
| Org primary color on auth pages | ⏳ | No `OrgBrandingProvider` on auth layout |
| Subdomain / slug-based org resolution on login | ⏳ | Research needed |
| Security review (no tenant data leak on public pages) | ⏳ | Required before implementation |

**Suggested investigation steps:**

1. Determine login URL strategy (`/login?org=slug` vs subdomain)
2. Public branding endpoint or embedded config for approved orgs only
3. Fallback to Entriss platform branding when org unknown
4. CSP and cache implications for org logos on auth pages

---

## 4. Performance Optimization Phase

| Item | Status | Notes |
|------|--------|-------|
| Dashboard parallel fetch audit | 🟡 | Investigated in 6.14; some dedup applied |
| Visits page duplicate fetch fix | ✅ | Phase 6.14 |
| Kiosk duplicate org settings fetch | ✅ | Phase 6.14 |
| Analytics snapshot caching | 🟡 | `AnalyticsSnapshot` model exists |
| Server component vs client boundary review | ⏳ | Broad audit not done |
| Database query index review | ⏳ | Not in scope of 6.x |
| Image/logo data-URL size limits | 🟡 | Validation exists; monitor perf |

---

## 5. Host Management Follow-Up

| Item | Status | Notes |
|------|--------|-------|
| Server-side department field | ⏳ | Currently `localStorage` only |
| HOST-role-only directory filter | ⏳ | Product decision — currently all active members |
| Host self-service profile | ⏳ | Not implemented |

---

## 6. Badge Printing Follow-Up

| Item | Status | Notes |
|------|--------|-------|
| Core print pipeline | ✅ | Stabilized |
| Theme-token print preview | ⏳ | Optional |
| Dedicated label printer integration | ⏳ | Future |
| Print queue / retry | ⏳ | Future |

---

## 7. Phase 7+ (from PROJECT-SNAPSHOT-PHASE7)

Reference: `docs/PROJECT-SNAPSHOT-PHASE7.md`

| Area | Priority |
|------|----------|
| Media infrastructure (visitor photos, documents) | High |
| Enterprise polish (onboarding, exports) | Medium |
| Billing / subscription stubs | Low |
| PostgreSQL RLS (optional hardening) | Low |

---

## 8. Technical Debt / Cleanup

| Item | Notes |
|------|-------|
| Remove `[VISIT_HOURS_DEBUG]` / `[BADGE_PRINT]` console logs | If still present in codebase |
| Run `npx prisma migrate deploy` on fresh environments | `themeMode` migration |
| Consolidate duplicate `MetricCard` components | Reception + analytics + live-activity (cosmetic DRY) |
| Update `docs/STATE-SNAPSHOT.md` header | Still references older checkpoint; superseded by this snapshot set |

---

## Suggested Next Sprint Order

1. **White-label login investigation** (product + security spike)
2. **Performance profiling** (dashboard, reception mount, analytics)
3. **Loader/UX polish** (remaining skeletons, feedback consistency)
4. **Host department persistence** (schema + API if approved)
5. **Phase 7 media infrastructure** per product roadmap

---

## Do Not Break (invariant checklist)

When picking up any next action:

- [ ] No cross-tenant data access
- [ ] Server remains authoritative for check-in policy
- [ ] QR verify before check-in
- [ ] RBAC on all mutating APIs
- [ ] Kiosk flow state machine unchanged unless explicitly scoped
- [ ] Badge print DOM/`#badge-print-root` contract preserved
