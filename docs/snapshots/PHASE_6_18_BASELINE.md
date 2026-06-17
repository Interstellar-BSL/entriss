# Phase 6.18 Baseline Snapshot

**Created:** 2026-06-17 (Wednesday)  
**Checkpoint label:** `PHASE_6_18_BASELINE`  
**Phase:** 6.18 — Full UI Surface Color Completion (recovery point)  
**Repository branch:** `master`  
**Prior commit:** `ce352a0` (Initial commit from Create Next App)

---

## Purpose

This document captures the **stable, functioning state** of Entriss immediately after Phases 6.14–6.18 (performance, branding, theme tokens, and surface color completion). Use it as a recovery reference before any further styling or feature work.

**This snapshot is documentation-only.** No APIs, schema, business logic, routing, or permissions were changed to produce it.

---

## Completed Features (through Phase 6.18)

### Platform & tenancy

- Multi-organization SaaS architecture (shared DB, row-level `organizationId` scoping)
- Tenant isolation (middleware, `withTenant`, service-layer guards, RBAC)
- Organization registration / request-access flow
- Platform admin console (org requests, suspend/reactivate, aggregate metrics)
- Onboarding and invite acceptance flows

### Host management (Phase 6.12)

- Canonical Host Directory (`lib/hosts/host-directory.ts`)
- Host Management screen (`/hosts`) — create, edit, deactivate, analytics
- Unified host pickers: Schedule Visit, Reception walk-in, Kiosk registration
- `HostPickerWithOther` — MEMBER vs OTHER host selection model
- Removal of visit-history-based host extraction

### Operations

- Reception Command Center (KPI tiles, approvals, overdue, walk-ins, fast actions)
- Reception QR scanner, manual lookup, quick register, visit overrides
- Kiosk self-service flows (QR, booking search, walk-in registration)
- Visit approvals workflow (host approval, pre-visit, force check-in/out)
- Notifications (in-app bell, notification center, email projection)

### Policy & timezone

- Server-authoritative check-in policy (`enforceVisitCheckInPolicy`)
- Visit-hour enforcement with **branch IANA timezone** (`Branch.timezone`, `evaluateVisitHours`)
- Branch timezone management in settings
- Kiosk operational policy gates (photo, documents, walk-ins, visit hours)

### Badge printing

- Client-side badge print pipeline (`lib/kiosk/badge-print-html.ts`, `badge-print-styles.ts`)
- Print status tracking on visits; kiosk/reception print actions
- Stabilized print layout (isolated print root, `@media print` rules in `globals.css`)

### Branding & theme (Phases 6.15–6.18)

- Organization branding settings: logo, primary/secondary colors, welcome message, `themeMode`
- `OrgBrandingProvider` — tenant-scoped CSS variable injection on `<html>`
- Logo picker with drag/drop, center-crop (256×256), data-URL support
- Entriss vs org brand hierarchy (platform logo in sidebar; org identity in header/footer)
- Global design tokens in `app/globals.css` (`--card`, `--surface-muted`, `--brand-primary`, `--on-brand`, `--link`, `--ring`, `--danger`, etc.)
- **Phase 6.17:** App-wide color token unification (non-kiosk bulk patch)
- **Phase 6.18:** Reception KPI cards, Analytics KPI cards, Kiosk surfaces/buttons, Reception primary actions

### Performance & loading (Phase 6.14)

- GET request deduplication (`lib/api/in-flight.ts`)
- Global loading provider (route + async progress bar)
- Button `loading` prop; action locks on critical flows (approvals, reception check-in, visit create)

---

## Major Architecture Decisions

| Area | Decision |
|------|----------|
| Tenancy | Shared schema; every tenant row carries `organizationId`; JWT is authoritative |
| Hosts | `OrganizationMember` is canonical; active-host filter in `host-directory` |
| Other host | Encoded in visitor notes/purpose; no schema change |
| Department (host) | Client `localStorage` only (`host-department-store.ts`) |
| Check-in policy | Single server gate; branch timezone drives visit hours |
| Branding | CSS variables on `document.documentElement`; `data-org-theme` for light/dark/system |
| UI tokens | Tailwind arbitrary values referencing `var(--*)`; no new color libraries |
| Kiosk styling | Centralized in `components/kiosk/kiosk-ui.ts` + `scripts/kiosk-theme-patch.mjs` |

---

## Branding Implementation Status

| Component | Status |
|-----------|--------|
| `lib/branding/` (resolve, css, colors, logo helpers) | ✅ Complete |
| `OrganizationSettings.themeMode` + migration | ✅ Schema + migration present |
| Settings → Branding panel (`LogoPicker`, color fields) | ✅ Complete |
| `OrgBrandingProvider` in app shell | ✅ Complete |
| `PlatformLogo` / `OrgLogo` / `BrandMark` | ✅ Complete |
| Kiosk branding (`KioskLogo`, welcome message) | ✅ Complete |
| Global token coverage (app UI) | ✅ Phase 6.17 complete |
| Kiosk/reception/analytics surface pass | ✅ Phase 6.18 complete |
| Login page white-label | ⏳ Not started (Entriss platform branding only) |
| Email template theming | ⏳ Excluded (inline HTML colors) |

---

## Host Management Implementation Status

| Item | Status |
|------|--------|
| `listActiveHosts` / `getHostById` / `searchHosts` | ✅ |
| `GET/POST /api/v1/organizations/hosts` | ✅ |
| `assertHostInTenant` on visit creation | ✅ |
| Host Management UI (`/hosts`) | ✅ |
| Schedule Visit picker | ✅ `HostPickerWithOther` |
| Reception quick register picker | ✅ |
| Kiosk register form picker | ✅ |
| Host analytics API + dashboard widget | ✅ |
| Department persistence server-side | ❌ Known limitation (localStorage) |

---

## Tenant Architecture Status

| Layer | Status |
|-------|--------|
| Middleware org approval + path alignment | ✅ |
| `withTenant` on `/api/v1/*` routes | ✅ |
| `TenantContext` in services | ✅ |
| RBAC permission catalog + org roles | ✅ |
| `RoutePermissionGuard` (UI) | ✅ |
| Platform admin isolation from tenant APIs | ✅ |
| PostgreSQL RLS | ❌ Future (Phase 2 optional) |
| Tenant scoping audit (`docs/TENANT-SCOPING-AUDIT.md`) | ✅ Documented |

---

## Known Remaining Items

See `docs/snapshots/NEXT_ACTIONS_6_18.md` for the full prioritized list.

**Highlights:**

- Badge-printing UI surfaces still use legacy zinc/white (intentionally excluded from theme pass)
- QR debug panel (`kiosk-qr-debug-panel.tsx`) not themed
- Login page not org-branded
- Host department not persisted server-side
- Email templates use fixed inline colors
- Performance profiling / further deduplication opportunities
- Phase 7+ enterprise polish per `docs/PROJECT-SNAPSHOT-PHASE7.md`

---

## Key Files (quick reference)

| Area | Path |
|------|------|
| Branding resolver | `lib/branding/resolve.ts` |
| CSS injection | `lib/branding/css.ts`, `components/providers/org-branding-provider.tsx` |
| Design tokens | `app/globals.css` |
| Host directory | `lib/hosts/host-directory.ts` |
| Host picker | `components/hosts/host-picker-with-other.tsx` |
| Visit-hour policy | `lib/server/policies/visit-checkin.policy.ts` |
| Branch timezone | `lib/settings/branch-timezones.ts`, `prisma` `Branch.timezone` |
| Badge print | `lib/kiosk/badge-print-html.ts`, `lib/kiosk/badge-print-styles.ts` |
| Kiosk UI tokens | `components/kiosk/kiosk-ui.ts` |
| Reception UI tokens | `components/reception/reception-ui.ts` |
| Theme patch scripts | `scripts/theme-token-patch.mjs`, `scripts/kiosk-theme-patch.mjs` |

---

## Related Snapshots

- `docs/snapshots/ARCHITECTURE_STATE_6_18.md` — architecture deep-dive
- `docs/snapshots/NEXT_ACTIONS_6_18.md` — outstanding work
- `docs/PROJECT-SNAPSHOT-PHASE7.md` — Phase 7 planning reference
- `docs/STATE-SNAPSHOT.md` — historical ground-truth (may predate 6.15–6.18)

---

## Recovery Instructions

1. Check out the git commit tagged in this baseline (see git log for `snapshot: phase 6.18 baseline`).
2. Run `npm install` and `npx prisma migrate deploy` if DB is behind.
3. Verify `npx tsc --noEmit` passes.
4. Compare current tree against this document if drift is suspected.
