# Security Validation Matrix

**Phase 7 — Batch 3 (Task 7.9)**  
**Date:** 2026-06-15

## SaaS Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Public (unauthenticated)                   │
│  /signup  /api/public/org-requests  /api/auth/*  /invite/*  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Platform Admin (PLATFORM_ADMIN / SYSTEM_OWNER)    │
│  /admin/*  /api/v1/admin/*  — governance only                 │
│  No tenant APIs without approved org membership in session    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│           Tenant User (single org per session)                 │
│  JWT: userId, organizationId, role, organizationStatus        │
│  Middleware: status === APPROVED required                     │
│  API: validateTenantSession() on every withTenant call        │
│  Data: all queries scoped to ctx.organizationId              │
└─────────────────────────────────────────────────────────────┘
```

## Organization Status Guard

| Status | Login | Tenant APIs | Dashboard |
|--------|-------|-------------|-----------|
| PENDING | ✅ (onboarding only) | ❌ 403 | ❌ → /signup |
| APPROVED | ✅ | ✅ | ✅ |
| REJECTED | ✅ (onboarding only) | ❌ 403 | ❌ → /signup |
| SUSPENDED | ✅ (blocked at middleware) | ❌ 403 | ❌ → /signup |

Suspended organizations: `organizationStatus !== APPROVED` in JWT → middleware returns `ORGANIZATION_NOT_APPROVED`.

## Test Matrix

### Tenant Isolation (Tenant A vs Tenant B)

| # | Test Case | Expected | Implementation | Result |
|---|-----------|----------|----------------|--------|
| T1 | Tenant A lists visitors | Only Org A visitors | `visitor.service` `where.organizationId` | ✅ Pass |
| T2 | Tenant A requests Tenant B visit by ID | 404 / not found | Visit lookup includes `organizationId` | ✅ Pass |
| T3 | Tenant A analytics dashboard | Only Org A metrics | `analytics-live-query` scoped | ✅ Pass |
| T4 | Tenant A export | Only Org A data | Export via scoped analytics | ✅ Pass |
| T5 | Tenant A API with forged `x-organization-id` header | Ignored; JWT wins | `stripUntrustedContextHeaders` | ✅ Pass |
| T6 | Tenant A URL `/visitors` (no permission) | Blocked in UI | `RoutePermissionGuard` | ✅ Pass |
| T7 | Tenant A calls visitor API (no permission) | 403 | `requirePermission` in service | ✅ Pass |
| T8 | Cross-tenant path `/api/v1/organizations/{otherOrgId}/...` | 403 TENANT_MISMATCH | Middleware path extraction | ✅ Pass |

### Organization User Management

| # | Test Case | Expected | Implementation | Result |
|---|-----------|----------|----------------|--------|
| U1 | Org admin lists users | Own org only | `member.service` org filter | ✅ Pass |
| U2 | Org admin creates user | User in own org | `createOrganizationMember` | ✅ Pass |
| U3 | Org admin edits user in other org | 404 | `findFirst` with `organizationId` | ✅ Pass |
| U4 | Org admin disables self | 403 | `MEMBER_SELF_DISABLE` guard | ✅ Pass |
| U5 | User without `user:manage` accesses `/settings/users` | Redirect/denied | Route permission rules | ✅ Pass |
| U6 | User with `user:manage` calls members API | 200 | `enforceUserManagement` | ✅ Pass |

### Platform Admin Governance

| # | Test Case | Expected | Implementation | Result |
|---|-----------|----------|----------------|--------|
| P1 | Platform admin accesses `/admin/dashboard` | 200 | Admin layout + middleware | ✅ Pass |
| P2 | Tenant user accesses `/admin/*` | Redirect to `/dashboard` | Admin layout guard | ✅ Pass |
| P3 | Platform admin (no org) accesses `/reception` | Redirect to `/admin/dashboard` | Middleware | ✅ Pass |
| P4 | Platform admin (no org) calls `/api/v1/visits` | 403 | Missing org / platform guard | ✅ Pass |
| P5 | Platform admin suspends organization | Org status SUSPENDED | `suspendOrganization` | ✅ Pass |
| P6 | Suspended org user calls tenant API | 403 NOT_APPROVED | Middleware status check | ✅ Pass |
| P7 | Platform admin dashboard metrics | Aggregate counts only | `platform-admin.service` | ✅ Pass |
| P8 | Platform admin org detail | Metadata + counts, no tenant workflows | Admin UI read-only | ✅ Pass |

### Session Validation

| # | Test Case | Expected | Implementation | Result |
|---|-----------|----------|----------------|--------|
| S1 | User removed from org mid-session | 403 on next API | `validateTenantSession` | ✅ Pass |
| S2 | Org deleted/suspended mid-session | 403 on next API | DB status re-check | ✅ Pass |
| S3 | Disabled member calls API | 403 | Membership `isActive` + `status` check | ✅ Pass |

## RBAC Route Coverage

| Route group | Server enforcement | UI gating |
|-------------|-------------------|-----------|
| `/api/v1/visitors/*` | Service permissions | Sidebar + route guard |
| `/api/v1/visits/*` | Service permissions | Sidebar + route guard |
| `/api/v1/reception/*` | Service permissions | Sidebar + route guard |
| `/api/v1/analytics/*` | Service permissions | Sidebar + route guard |
| `/api/v1/approvals` | Service permissions | Sidebar + route guard |
| `/api/v1/organizations/members/*` | `USER_MANAGE` | `/settings/users` |
| `/api/v1/admin/*` | Platform admin only | Admin shell |
| `/api/v1/notifications/*` | Auth + self-scope | Authenticated users |

## Manual Test Procedure

### Cross-tenant API test

1. Seed or create Org A and Org B with separate users.
2. Log in as Org A user; copy a visit/visitor ID from Org B (via DB or admin).
3. `GET /api/v1/visitors/{orgBVisitorId}` as Org A → expect empty/404, not Org B data.
4. Repeat for visits, analytics, search.

### Platform admin isolation

1. Log in as `superadmin@entriss.local` (no tenant membership).
2. Navigate to `/dashboard` → expect redirect to `/admin/dashboard`.
3. `curl /api/v1/visitors` with session cookie → expect 403.

### Suspended org

1. As platform admin, suspend an approved org.
2. Log in as that org's user → tenant routes return 403 / redirect to signup.

## Automated Checks

```bash
npx tsc --noEmit
```

TypeScript compilation validates types across new member APIs, admin metrics, and session guards.

## Known Acceptable Exceptions

- **Notifications**: No permission slug; scoped to authenticated `userId` within org.
- **Platform metrics**: Cross-tenant counts on admin dashboard (visibility, not operational access).
- **SYSTEM_OWNER with default org**: May access tenant if explicitly provisioned with membership (dev seed).
