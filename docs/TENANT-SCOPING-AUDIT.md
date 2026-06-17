# Tenant Scoping Audit

**Phase 7 — Batch 3 (Tasks 7.5–7.9)**  
**Date:** 2026-06-15  
**Scope:** All tenant-facing services, APIs, and data paths

## Summary

| Metric | Count |
|--------|------:|
| Service modules reviewed | 33 |
| Tenant API routes (`/api/v1/*` excl. admin/public) | 56 |
| Queries fixed in this batch | 1 |
| Queries already compliant | All tenant services |
| Intentionally unscoped (platform) | `platform-admin.service.ts` |

## Enforcement Layers

1. **Middleware** — JWT `organizationId`, `organizationStatus === APPROVED`, path/org mismatch rejection
2. **`withTenant` wrapper** — `requireTenantContext()` + `validateTenantSession()` on every tenant API
3. **Service layer** — `ctx.organizationId` on all reads/writes; `requirePermission()` / `enforceUserManagement()` etc.
4. **Internal guards** — `assertBranchInTenant`, `assertHostInTenant` in `lib/services/internal/tenant-guards.ts`
5. **UI** — Permission-filtered sidebar + `RoutePermissionGuard` client checks (server remains authoritative)

---

## Areas Checked

### Visitors (`visitor.service.ts`, notes, tags, timeline, insights, duplicates, last-visit)

| Status | Notes |
|--------|-------|
| ✅ Compliant | All `findMany` / `findFirst` / `update` use `organizationId: ctx.organizationId` or visitor scoped via prior tenant lookup |

### Visits (`visit.service.ts`, `visit-override.service.ts`, `qr.service.ts`, `badge.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Visit lookups include `organizationId`; QR generation now requires `VISITOR_READ` |
| ✅ Fixed (prior batch) | `qr.service.ts` permission enforcement added |

### Approvals (`approval.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Approval queues filtered by `organizationId` |

### Reception (`reception-dashboard.service.ts`, `recent-visitors.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Branch and visit queries scoped to `ctx.organizationId` |

### Analytics (`lib/analytics/**`, `analytics-*-service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Live queries use `organizationId: ctx.organizationId`; snapshots keyed per org |
| ✅ Fixed (prior batch) | Audit analytics require `AUDIT_READ` |

### Notifications (`notification.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Listed by `organizationId` + `userId` (self-scoped inbox; no cross-user leak) |

### Activity (`activity-stream.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Activity feed filtered by `organizationId` |

### Exports (`analytics-export.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Export runs through analytics query layer with tenant context |

### Organizations (`organization.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Direct org creation disabled; membership checks prevent multi-org assignment |

### Users & Members (`member.service.ts`, `invite.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | All member CRUD uses `organizationId: ctx.organizationId`; roles resolved within org |
| ✅ Added | `listOrganizationRoles()` — `GET /api/v1/organizations/roles` |

### Roles

| Status | Notes |
|--------|-------|
| ✅ Compliant | Role lookups always include `organizationId: ctx.organizationId` |

### Branches (`branch.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Branch CRUD scoped to `ctx.organizationId` |

### Hosts

| Status | Notes |
|--------|-------|
| ✅ Compliant | `assertHostInTenant` validates `organizationMember.organizationId` |

### Settings (`settings.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Org settings use `ctx.organizationId` |
| ✅ **Fixed** | `getBranchSettings` — `branchSettings.findFirst({ branchId, organizationId })` instead of `findUnique({ branchId })` only |
| ✅ Acceptable | `updateBranchSettings` / `ensureBranchSettings` use `branchId` unique key but preceded by `assertBranchInOrganization` + org mismatch check |

### Search (`unified-search.service.ts`)

| Status | Notes |
|--------|-------|
| ✅ Compliant | Visitor/visit/note search includes `organizationId` |

### Platform admin (`platform-admin.service.ts`)

| Status | Notes |
|--------|-------|
| ⚪ By design | Cross-tenant aggregate counts for governance dashboard only; no tenant workflow mutation except suspend/reactivate |

---

## API RBAC Audit

All tenant routes use `withTenant` / `withTenantParams` / `withRequestContext`, which call `requireTenantContext()` → `validateTenantSession()`.

Permissions enforced in **services** via `requirePermission`, `enforceUserManagement`, etc.

| Area | Routes | Protection |
|------|--------|------------|
| Visitors | 12 | `VISITOR_*` in services |
| Visits | 14 | `VISIT_*` / `VISITOR_*` in services |
| Approvals | 1 | Approval permissions in service |
| Reception | 2 | Check-in / read permissions |
| Analytics | 5 | `VISITOR_READ`, `AUDIT_READ` |
| Notifications | 3 | Self-scoped by user (inbox) |
| Settings | 3 | `BRANCH_MANAGE`, `USER_MANAGE` |
| Branches | 2 | `BRANCH_MANAGE` |
| Organizations/members | 5 | `USER_MANAGE` |
| Activity | 1 | `VISITOR_READ` |
| Search | 1 | `VISITOR_READ` |
| Admin | 9 | Platform admin guard (no tenant context) |

### UI RBAC

| Component | Change |
|-----------|--------|
| `sidebar.tsx` | `filterNavItemsForPermissions()` |
| `route-permission-guard.tsx` | Blocks URL bypass for gated routes |
| `settings-page.tsx` | Tabs hidden without permissions |
| `/settings/users` | `USER_MANAGE` via route rules |

---

## Fixes Applied (This Batch)

1. **`settings.service.ts`** — Branch settings read now includes `organizationId` in `where` clause
2. **`member.service.ts`** — `listOrganizationRoles()` with org scope
3. **`/settings/users`** — Organization user management UI
4. **Middleware** — Platform admins without org redirected from tenant paths
5. **`app/(app)/layout.tsx`** — Platform admins without tenant membership → `/admin/dashboard`
6. **`validate-tenant-session.ts`** + **`session.ts`** — DB re-validation on each API request

---

## Residual Notes

- **Notifications** intentionally omit a permission slug; data is limited to `userId` + `organizationId` of the authenticated user.
- **`branchSettings.findUnique({ branchId })`** in update paths remains safe because `branchId` is globally unique and `assertBranchInOrganization` runs first.
- **Platform admin** aggregate metrics (total visitors across all orgs) are visibility-only, not tenant data drill-down.

---

## Verification

Run TypeScript check:

```bash
npx tsc --noEmit
```

Manual cross-tenant tests documented in `docs/SECURITY-VALIDATION.md`.
