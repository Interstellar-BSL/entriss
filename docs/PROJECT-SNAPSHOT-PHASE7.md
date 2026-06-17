# Entriss Platform Snapshot — Phase 7

**Milestone:** Multi-Tenant SaaS Foundation Complete  
**Snapshot Date:** June 2026  
**Audience:** Senior engineers onboarding to Entriss  
**Source:** Code audit, schema review, and existing audit documents (`TENANT-SCOPING-AUDIT.md`, `SECURITY-VALIDATION.md`, `NOTIFICATION-COVERAGE-AUDIT.md`, `STATE-SNAPSHOT.md`)

> This document covers everything implemented from **Multi-Organization Support** through **Host Management** and **Notification/Email** improvements. It is documentation only — no code, schema, or behavior changes are implied.

---

## Table of Contents

1. [Platform Status](#section-1--platform-status)
2. [Phase 7 Multi-Tenant Implementation](#section-2--phase-7-multi-tenant-implementation)
3. [Onboarding Flow](#section-3--onboarding-flow)
4. [Organization Management](#section-4--organization-management)
5. [Host Management](#section-5--host-management)
6. [Notification System](#section-6--notification-system)
7. [Email System](#section-7--email-system)
8. [Dashboards](#section-8--dashboards)
9. [Kiosk](#section-9--kiosk)
10. [Security](#section-10--security)
11. [Current Routes](#section-11--current-routes)
12. [Database Inventory](#section-12--database-inventory)
13. [Known Limitations](#section-13--known-limitations)
14. [Next Recommended Phases](#section-14--next-recommended-phases)

---

## SECTION 1 — PLATFORM STATUS

Entriss is a **multi-tenant SaaS visitor management platform** built on **Next.js (App Router)**, **PostgreSQL**, **Prisma**, and **NextAuth v4**. A single shared database hosts all tenants; isolation is enforced at the application layer via `organizationId` on every tenant-owned row.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLATFORM ADMIN LAYER                             │
│  SYSTEM_OWNER / PLATFORM_ADMIN — governance, org lifecycle, alerts     │
│  Routes: /admin/*  |  APIs: /api/v1/admin/*                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         TENANT ORGANIZATION LAYER                        │
│  Organization (tenant root) — status, settings, branches, RBAC           │
│  One active org per user session (JWT organizationId)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ ORG USERS     │         │ VISITOR MGMT    │         │ RECEPTION OPS   │
│ Members       │         │ Visitors        │         │ Check-in/out    │
│ Invites       │         │ Visits          │         │ Walk-ins        │
│ Roles/RBAC    │         │ Timeline/notes  │         │ QR resolve      │
└───────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  KIOSK OPS          HOST DIRECTORY         NOTIFICATIONS + EMAIL         │
│  Self check-in      Canonical hosts        In-app + transactional email  │
│  Walk-in register   Host pickers           Queue, retry, DLQ              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS — live queries + precomputed snapshots (dashboard, hosts)    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Summaries

| Layer | Responsibility | Key enforcement |
|-------|----------------|-----------------|
| **Multi-tenant SaaS** | Shared DB, row-level tenant isolation | `organizationId` on all tenant tables; middleware + `withTenant` |
| **Platform Admin** | Org requests, suspend/reactivate, aggregate metrics | `isPlatformAdmin()`; no tenant APIs without org membership |
| **Tenant Organizations** | Tenant root: name, slug, status, settings | `OrgStatus`: PENDING → APPROVED → SUSPENDED |
| **Organization Users** | Members, invites, roles | `OrganizationMember` + RBAC permissions |
| **Visitor Management** | Persistent visitor identity per org | Email/phone resolution (no silent merge) |
| **Reception Operations** | Command center, check-in/out, overrides | `enforceVisitCheckInPolicy`, QR server verify |
| **Kiosk Operations** | Self-service registration and check-in | Branch operational policy, approval polling |
| **Notifications** | Event-driven in-app + email projection | `emitNotification()` side-effect layer |
| **Email Infrastructure** | Microsoft Graph → SMTP → console fallback | Idempotent delivery logs, retry engine |
| **RBAC** | Permission catalog + org-scoped roles | `enforcePermission()` in services; UI route guards |
| **Analytics** | KPIs, trends, host/branch breakdowns | Tenant-scoped queries + `AnalyticsSnapshot` |

### How Layers Interact

1. **Public user** submits an organization access request → stored in `OrganizationRequest` (platform-scoped).
2. **Platform admin** approves → organization created, org-admin user provisioned, invite/setup-password email sent.
3. **Org admin** signs in → JWT carries `organizationId`, `role`, `organizationStatus: APPROVED`.
4. **Middleware** validates session, org approval, and tenant path alignment; injects trusted request headers.
5. **Tenant APIs** call `withTenant` → `validateTenantSession()` → service layer with `ctx.organizationId`.
6. **Operational flows** (schedule visit, reception, kiosk) create visits against visitors and hosts.
7. **Visit lifecycle events** (check-in, approval, cancel) trigger `emitNotification()` → in-app bell + email queue.
8. **Analytics** reads tenant-scoped visit/visitor aggregates for dashboards.

---

## SECTION 2 — PHASE 7 MULTI-TENANT IMPLEMENTATION

Phase 7 establishes Entriss as a production-ready multi-tenant SaaS: schema lifecycle fields, middleware tenant resolution, governed onboarding, invite-based provisioning, RBAC hardening, user management UI, data isolation audit, platform admin governance, and security validation.

### 7.1 Tenant Schema

**Architecture decision:** Shared PostgreSQL with **row-level isolation** via `organizationId`. No per-tenant databases. Global tables (`User`, `Permission`, `Plan`) coexist with tenant-scoped tables.

**Key schema additions (Phase 7.1):**

| Model / Enum | Purpose |
|--------------|---------|
| `OrgStatus` | `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED` on `Organization` |
| `MemberStatus` | `ACTIVE`, `INVITED`, `DISABLED` on `OrganizationMember` |
| `OrganizationRequest` | Platform-scoped onboarding requests |
| `Role.organizationId` | Nullable — `null` = global system role template |
| `OrganizationInvite` | Token-hashed invites with expiry and lifecycle |

**Tables involved:** `organizations`, `organization_members`, `organization_invites`, `organization_requests`, `roles`, `role_permissions`, `permissions`

**Services:** `organization.service.ts`, `organization-request.service.ts`, `organization-request-approval.service.ts`, `member.service.ts`, `invite.service.ts`

**APIs:**
- `POST /api/public/org-requests` — public request submission
- `GET/POST /api/v1/admin/org-requests/*` — platform admin review
- `GET/POST /api/v1/organizations/members/*` — tenant member management
- `GET/POST /api/v1/organizations/invites/*` — tenant invite management

### 7.2 Tenant Middleware

**File:** `middleware.ts` + `lib/tenant/middleware-org-resolution.ts`

**Architecture decision:** Middleware is the **first gate**; it never trusts client-supplied `x-organization-id` without JWT validation (`stripUntrustedContextHeaders`).

**Flow:**

1. Public API/UI paths bypass auth (`/login`, `/request-access`, `/api/auth/*`, invite accept).
2. Platform admin paths (`/admin/*`) require `PLATFORM_ADMIN` or `SYSTEM_OWNER`.
3. Platform admins **without** tenant membership are redirected away from tenant UI/APIs.
4. Tenant paths require JWT with `organizationId` and `organizationStatus === APPROVED`.
5. Path-based org ID extraction detects **cross-tenant URL tampering** → `403 TENANT_MISMATCH`.
6. Approved org context injected into request headers for downstream `withTenant`.

**Public path prefixes:** `/login`, `/signup`, `/request-access`, `/invite`, `/accept-invite`, `/setup-password`  
**Onboarding paths:** `/onboarding`, `/request-access` (allowed without approved org)

### 7.3 Organization Onboarding

**Architecture decision:** Organizations are **not self-created**. All new tenants flow through platform-governed approval.

**Flow:**
1. `createOrganizationRequest()` — public form → `OrganizationRequest` with `PENDING`
2. `emitPlatformNotification(ORG_ONBOARDING_REQUESTED)` — alerts platform admins
3. `approveOrganizationRequest()` — transactional: org create/resolve, role seed, admin user, invite, request update
4. `sendOrganizationApprovalEmail()` — setup-password link to contact
5. Admin completes `/setup-password` → can sign in and manage org

**Services:** `organization-request.service.ts`, `organization-request-approval.service.ts`  
**APIs:** `POST /api/public/org-requests`, `POST /api/v1/admin/org-requests/[id]/approve`, `POST /api/v1/auth/setup-password`

### 7.4 Invite System

**Architecture decision:** Raw invite tokens exist **only in email links**; DB stores SHA-256 hash (`tokenHash`).

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting acceptance |
| `ACCEPTED` | User joined org |
| `REVOKED` | Admin revoked |
| `EXPIRED` | Past `expiresAt` |

**Services:** `invite.service.ts`, `member.service.ts`  
**APIs:**
- `GET /api/v1/invites/[token]` — preview (public)
- `POST /api/v1/invites/accept` — accept invite
- `POST /api/v1/invites/resend/[id]` — resend
- `POST /api/v1/invites/revoke/[id]` — revoke
- `GET/POST /api/v1/organizations/invites` — org-scoped list/create

**UI:** `/settings/invites`, `/invite/[token]`, `/accept-invite`, `/setup-password`

### 7.5 RBAC Hardening

**Architecture decision:** Permissions are a **global catalog** seeded once; roles are **org-scoped** with denormalized `organizationId` on `RolePermission` for efficient tenant queries.

**Default system roles** (`lib/rbac/roles.ts`):

| Slug | Purpose |
|------|---------|
| `owner` | Full permissions |
| `org-admin` | Provisioned at tenant creation |
| `admin` | User/branch/visitor management |
| `receptionist` | Front desk operations |
| `security` | Force check-in/out |
| `viewer` | Read-only |
| `host` | Host role (assigned via Host Management) |

**Enforcement layers:**
1. **Service:** `enforcePermission(ctx, PERMISSIONS.*)` in `lib/rbac/enforce.ts`
2. **Navigation:** `filterNavItemsForPermissions()` in `lib/rbac/navigation.ts`
3. **Route guard:** `RoutePermissionGuard` + `ROUTE_PERMISSION_RULES`
4. **API wrapper:** `withTenant` on all `/api/v1/*` tenant routes

**Permission catalog** (`lib/rbac/permissions.ts`): `visitor:*`, `visit:*`, `branch:manage`, `user:manage`, `invite:*`, `audit:read`, etc.

### 7.6 User Management

**Architecture decision:** Org admins manage members within their tenant only; self-disable is blocked.

**Capabilities:**
- List members (`listMembers`)
- Create member / host (`createOrganizationMember`, `createOrganizationHost`)
- Update role (`updateMember`)
- Disable member (`disableMember` — sets `status: DISABLED`, `isActive: false`)
- List org roles (`listOrganizationRoles`)

**UI:** `/settings/users` — requires `user:manage`  
**APIs:** `/api/v1/organizations/members`, `/api/v1/organizations/members/[memberId]`, `/api/v1/organizations/members/[memberId]/disable`, `/api/v1/organizations/roles`

### 7.7 Data Isolation Audit

**Document:** `docs/TENANT-SCOPING-AUDIT.md` (Phase 7, Tasks 7.5–7.9)

**Summary:** 33 service modules and 56 tenant API routes reviewed. All tenant services scope queries with `ctx.organizationId`. One fix applied: branch settings read now includes `organizationId` in `where` clause.

**Internal guards** (`lib/services/internal/tenant-guards.ts`):
- `assertBranchInTenant(ctx, branchId)`
- `assertHostInTenant(ctx, hostMemberId)` — validates active member + active user

### 7.8 Platform Admin Governance

**Architecture decision:** Platform admins operate in a **separate portal** (`/admin/*`) with aggregate visibility but no tenant workflow access unless explicitly provisioned with org membership.

**Capabilities:**
- Dashboard aggregate metrics (cross-tenant counts — visibility only)
- Review org requests (`/admin/org-requests`)
- List/manage organizations (`/admin/organizations`)
- Suspend organization (`POST /api/v1/admin/organizations/[id]/suspend`)
- Reactivate organization (`POST /api/v1/admin/organizations/[id]/reactivate`)
- Test email delivery (`POST /api/v1/admin/email/test`)

**Service:** `platform-admin.service.ts` (intentionally cross-tenant for governance metrics)

### 7.9 Security Validation

**Document:** `docs/SECURITY-VALIDATION.md`

**Key validations:**
- Cross-tenant API access blocked (T1–T8)
- User management scoped to own org (U1–U6)
- Platform admin isolation (P1–P8)
- Session re-validation on every API call (S1–S3)

**Session validation** (`lib/auth/validate-tenant-session.ts`): Re-checks membership `isActive`, `status`, and org `status` on each `withTenant` request — stale JWTs fail fast.

---

## SECTION 3 — ONBOARDING FLOW

### End-to-End Process

```
Public User                    Platform Admin                 Org Admin
    │                               │                            │
    ▼                               │                            │
/request-access                     │                            │
POST /api/public/org-requests       │                            │
    │                               │                            │
    │──── OrganizationRequest ─────►│                            │
    │         (PENDING)             │                            │
    │                               ▼                            │
    │                    /admin/org-requests                     │
    │                    Review request                          │
    │                               │                            │
    │                    ┌──────────┴──────────┐                 │
    │                    ▼                     ▼                 │
    │               Approve               Reject                 │
    │                    │                     │                 │
    │         Organization created      Rejection email          │
    │         Org-admin user created                             │
    │         Invite + setup-password                            │
    │         email sent                                         │
    │                               │                            │
    │                               │         /setup-password    │
    │                               │         Set password       │
    │                               │              │             │
    │                               │              ▼             │
    │                               │         /login → sign in   │
    │                               │              │             │
    │                               │              ▼             │
    │                               │    Manage organization     │
    │                               │    (/settings/users, etc.) │
```

### Routes

| Step | Route | Access |
|------|-------|--------|
| Request access | `/request-access` | Public |
| Confirmation | `/request-access/received` | Public |
| Admin review | `/admin/org-requests` | Platform admin |
| Admin org list | `/admin/organizations` | Platform admin |
| Admin org detail | `/admin/organizations/[id]` | Platform admin |
| Password setup | `/setup-password?token=...` | Public (token-gated) |
| Sign in | `/login` | Public |
| Post-login dashboard | `/` or `/dashboard` | Approved org member |

> **Note:** The admin requests screen is at `/admin/org-requests` (nav label: "Requests"). There is no `/admin/requests` route.

### Approval Side Effects

On approve (`approveOrganizationRequest`):
1. Permission catalog sync (`seedPermissions`)
2. Organization create or resolve by name
3. Default roles + `org-admin` role assignment
4. Admin user create or resolve by contact email
5. `OrganizationMember` upsert (ACTIVE)
6. `OrganizationInvite` with hashed token
7. `OrganizationRequest` → APPROVED
8. Audit logs (org + platform)
9. Approval email with setup-password URL
10. Platform notification (`ORG_APPROVED`)

---

## SECTION 4 — ORGANIZATION MANAGEMENT

### Organizations

| Field | Purpose |
|-------|---------|
| `name`, `slug` | Display identity; slug unique globally |
| `status` | `OrgStatus` lifecycle |
| `isActive` | Backward-compatible active flag |
| `settings` | JSON blob (org email, plan request metadata) |
| `logoUrl` | Branding (limited UI today) |

**Lifecycle:** PENDING (request) → APPROVED (active) → SUSPENDED (platform admin) → reactivate

### Members

`OrganizationMember` links `User` ↔ `Organization` with a `Role`.

| Field | Purpose |
|-------|---------|
| `status` | `ACTIVE`, `INVITED`, `DISABLED` |
| `isActive` | Compatibility flag |
| `deactivatedAt` | Disable timestamp |
| `roleId` | RBAC role within org |

Members can host visits (`hostedVisits`) and act as approvers (`approvals`).

### Invites

Token-based onboarding for additional org users. Managed at `/settings/invites` with `invite:create`, `invite:list`, `invite:resend`, `invite:revoke` permissions.

### Roles & Permissions

- **Global permission catalog** — seeded once, not tenant-scoped
- **Org-scoped roles** — created per organization via `createOrganizationDefaults()`
- **RolePermission** — denormalized `organizationId` for tenant-filtered joins

### Suspension & Reactivation

| Action | Actor | Effect |
|--------|-------|--------|
| Suspend | Platform admin | `Organization.status → SUSPENDED`; JWT middleware blocks tenant APIs |
| Reactivate | Platform admin | `Organization.status → APPROVED`; access restored |

Platform notifications (`ORG_SUSPENDED`) alert platform admins. Suspended org users receive `403 ORGANIZATION_NOT_APPROVED` on tenant routes.

### Isolation Model

```
User (global identity)
  └── OrganizationMember (tenant-scoped)
        └── Role → RolePermission → Permission
  └── All operational data (Visitor, Visit, Branch, etc.)
        └── organizationId = tenant boundary
```

**Rules:**
- Every tenant query includes `organizationId: ctx.organizationId`
- Cross-tenant IDs return 404/not-found, never foreign data
- Platform admin aggregate metrics do not expose per-tenant record drill-down
- JWT `organizationId` is authoritative; client headers are stripped

---

## SECTION 5 — HOST MANAGEMENT

Phase 6.12 unified host selection across all surfaces. Visit-history-based host extraction was **removed**.

### Canonical Host Directory

**Server module:** `lib/hosts/host-directory.ts`

| Function | Purpose |
|----------|---------|
| `listActiveHosts(ctx)` | All active org members (sorted by name) |
| `getHostById(ctx, hostMemberId)` | Single active host lookup |
| `searchHosts(ctx, query)` | Name/email search (max 25) |

**Active host criteria:**
- `organizationMember.isActive === true`
- `status === ACTIVE`
- `deactivatedAt === null`
- `user.isActive === true`

**Permission:** `visitor:read` (via `enforcePermission`)

**API:**
- `GET /api/v1/organizations/hosts` — list/search
- `POST /api/v1/organizations/hosts` — create host (assigns HOST role)
- `GET /api/v1/organizations/hosts/[hostMemberId]` — detail

**Client wrapper:** `lib/api/hosts.ts` — enriches department from localStorage

### Host Management Screen (`/hosts`)

**Component:** `components/hosts/hosts-page.tsx`  
**Permission:** `user:manage`

**Features:**
- Lists all members with visit analytics (`getHostAnalytics`)
- Create host modal (auto-assigns HOST role, no manual role picker)
- Edit / deactivate hosts
- Department field (stored client-side — see limitations)
- Host detail drawer with visit history

**Data sources:**
- **Management UI:** `listMembers()` — all members + analytics
- **Pickers:** `listActiveHosts()` — active directory only

### Host Creation

`createOrganizationHost()` in `member.service.ts`:
1. Create or resolve user by email
2. Create `OrganizationMember` with HOST role
3. `ensureHostRole()` provisions HOST system role if missing

### Host Deactivation

Via `disableMember()` — sets member inactive; host no longer appears in `listActiveHosts()` or pickers. `assertHostInTenant()` rejects inactive hosts on visit creation.

### Host Analytics

`GET /api/v1/analytics/hosts` — per-host visit counts, active visits, trends. Used by Host Management screen and dashboard top-hosts widget.

### Host Picker Unification (Phase 6.12)

**Shared component:** `components/hosts/host-picker-with-other.tsx`

| Surface | Integration |
|---------|-------------|
| Schedule Visit (`/visits/new`) | `HostPickerWithOther` in `new-visit-form.tsx` |
| Reception walk-in | `quick-register.tsx` |
| Kiosk registration | Inline in `kiosk-register-form.tsx` (dedicated host step removed) |

**Selection model** (`lib/hosts/host-selection.ts`):

| Mode | Behavior |
|------|----------|
| `MEMBER` | `hostMemberId` from canonical directory |
| `OTHER` | Custom host name/dept/email encoded in `visitor.notes` (JSON) or `purpose` suffix; `hostMemberId` = session proxy member |

**Display:** `lib/hosts/display.ts` — `resolveHostDisplayNameFromVisit()` reads MEMBER or OTHER host labels consistently across dashboard, visits table, reception, approvals, kiosk.

### Removal of Visit-History Host Extraction

**Deleted:** `lib/visits/hosts.ts` (`loadHostOptions`, `extractHostsFromVisits`)  
**Deleted:** `components/hosts/kiosk-host-picker.tsx`

**Before:** Schedule Visit built host dropdown from distinct `hostMemberId` values in past visits.  
**After:** All pickers source from `OrganizationMember` via host directory API.

### Architecture Decision Summary

| Topic | Decision |
|-------|----------|
| Canonical source | `OrganizationMember` via `host-directory` |
| Picker dataset | Active members only |
| HOST role | Auto-assigned on host creation; directory returns all active members (not strictly HOST-role filtered) |
| Department | Client-only `localStorage` (`host-department-store.ts`) |
| Other host | No schema change; encoded in notes/purpose |

---

## SECTION 6 — NOTIFICATION SYSTEM

Entriss uses an **event-driven notification projection layer** — a non-invasive side-effect on visit, approval, and platform lifecycle flows. Domain logic is unchanged; notifications are emitted after successful mutations.

### Architecture Overview

```
Domain Event (visit check-in, approval, org suspend, etc.)
        │
        ▼
emitNotification() / emitPlatformNotification()
        │
        ▼
mapEventToNotifications() / mapPlatformEventToNotifications()
        │
        ├──► In-app payloads → NotificationJob (in-app-batch)
        ├──► Transactional emails → NotificationJob (transactional-email)
        └──► Platform emails → NotificationJob (platform-email)
        │
        ▼
InMemoryNotificationQueue (Postgres-backed jobs)
        │
        ▼
processNotificationJob() → worker
        ├── in-app-delivery.ts → AppNotification table
        ├── email-delivery.ts → Graph/SMTP
        └── webhook.channel.ts (stub)
```

### Phase 6.1 — Visitor Arrival Notifications

**Status:** COMPLETE

| Trigger | Domain event | Recipients |
|---------|--------------|------------|
| Check-in | `VISITOR_ARRIVED` | Host, branch admins |
| Force check-in | `VISITOR_ARRIVED` + `SECURITY_OVERRIDE` | Host, branch admins, org admin, platform admin |

**Hook:** `visit.service.ts` → `projectVisitStatusNotification()`; `visit-override.service.ts` for forced check-in

### Phase 6.2 — Approval Notifications

**Status:** COMPLETE

| Type | Trigger | Domain event |
|------|---------|--------------|
| Approval request | Visit enters pending approval | `APPROVAL_REQUEST` |
| Approval reminder | Pending > 15 min (lazy on `GET /notifications`) | `APPROVAL_REMINDER` |

**Hook:** `approval.service.ts` → `emitNotification()`; reminder via `projectApprovalReminderNotifications()`

### Phase 6.3 — Visit Status Notifications

**Status:** COMPLETE

| Transition | Domain event |
|------------|--------------|
| Approved | `VISIT_APPROVED` |
| Rejected | `VISIT_REJECTED` |
| Cancelled | `VISIT_CANCELLED` |
| Checked out | `VISIT_COMPLETED` |

Security overrides emit `SECURITY_OVERRIDE` on force check-in/out.

### Phase 6.4 — Notification Center

**Status:** COMPLETE

| Component | Route | Purpose |
|-----------|-------|---------|
| `NotificationBell` | Header | Unread badge + 30s polling |
| `NotificationDropdown` | Header | Quick panel, mark read |
| `NotificationCenterPage` | `/notifications` | Full history + category filters |

**Filters:** All, Arrivals, Approvals, System  
**Storage:** `AppNotification` table (reused, no migration for center itself)

**APIs:**
- `GET /api/v1/notifications` — list + `unreadCount`; `?category=&unreadOnly=`
- `POST /api/v1/notifications/read` — mark one read
- `POST /api/v1/notifications/read-all` — mark all read

### Phase 6.5 — Channel Abstraction

**Status:** COMPLETE (stubs for external channels)

```typescript
interface INotificationChannel {
  name: string;
  deliver(message: NotificationChannelMessage): Promise<void>;
}
```

**Stubs:** `slack`, `teams`, `sms`, `whatsapp` — console log only (`lib/notifications/channels/external.channels.ts`)

### Phase 6.6 — Transactional Email Templates

**Status:** COMPLETE

**Module:** `lib/notifications/email/email.templates.ts`, `email.renderer.ts`, `email.builder.ts`

**Email types:**
- `VISITOR_APPROVED`, `VISITOR_REJECTED`, `VISITOR_CANCELLED`
- `VISITOR_CHECKED_IN`, `VISITOR_CHECKED_OUT`
- `APPROVAL_REQUEST`, `APPROVAL_REMINDER`
- `HOST_VISITOR_ARRIVED`

Templates support QR embedding, visit metadata, and branded HTML rendering.

### Phase 6.7 — Email Channel Wiring

**Status:** COMPLETE

**Module:** `lib/notifications/channels/email.channel.ts`

Delivery priority: **Microsoft Graph → SMTP → console** (dev only). Throws `EmailDeliveryError` on failure to enable queue retries.

### Phase 6.8 — Notification Coverage Audit

**Status:** COMPLETE  
**Document:** `docs/NOTIFICATION-COVERAGE-AUDIT.md`

Unified event→recipient mapping for tenant and platform events. Gaps fixed:
- Platform admin alerts on org lifecycle, security override, force check-in
- Host in-app on approve/reject
- Host arrival email (`HOST_VISITOR_ARRIVED`)
- Org suspend and duplicate HIGH-confidence alerts

**Single source of truth:**
- Tenant: `emitNotification()` → `mapEventToNotifications()` → `buildAndEnqueueTransactionalEmails()`
- Platform: `emitPlatformNotification()` → `mapPlatformEventToNotifications()` → `buildAndEnqueuePlatformEmails()`

### Phase 6.9 — Notification Queue, Retry, Dead Letter Queue

**Status:** COMPLETE

**Tables:** `notification_jobs`, `notification_dlq`  
**Queue:** `InMemoryNotificationQueue` — Postgres-durable jobs with in-process drain + retry timers

| Feature | Implementation |
|---------|----------------|
| Job persistence | `NotificationJob` with `idempotencyKey` |
| Retry schedule | Exponential backoff: 0s, 10s, 30s, 2m, 10m + jitter |
| Max retries | 5 (default) |
| DLQ | Failed jobs moved to `NotificationDlq` |
| Delivery tracking | `AppNotification.deliveryStatus`, `EmailDeliveryLog` |

**Worker:** `lib/notifications/worker/notification.worker.ts`  
**Startup:** `startNotificationEngine()` from queue module

### Phase 6.10 — Platform Notifications

**Status:** COMPLETE

**Module:** `lib/notifications/platform-projector.ts`, `platform-email.builder.ts`

Platform events: `ORG_ONBOARDING_REQUESTED`, `ORG_APPROVED`, `ORG_REJECTED`, `ORG_SUSPENDED`, `DUPLICATE_DETECTED`, `KIOSK_SESSION_FAILED`, `SECURITY_OVERRIDE`, `PLATFORM_FORCE_CHECKIN`

Platform admin recipients resolved via `resolvePlatformAdminRecipients()` (cached 5 min). In-app notifications stored under default-org context for platform admin visibility.

### Phase 6.11 — Host & Visitor Notification Wiring

**Status:** COMPLETE

| Recipient | Channels |
|-----------|----------|
| Visitor | Email on approve, reject, cancel, check-in, check-out |
| Host | In-app + email on visitor arrival |
| Approvers | In-app + email on approval request/reminder |
| Org admin | In-app on security events |
| Platform admin | In-app + email on governance/security alerts |

Invite emails remain in dedicated `invite-email.ts` / `approval-email.ts` paths (no duplicate in-app for `USER_INVITED`).

### Phase 6.12 — Host Picker Unification

**Status:** COMPLETE (see Section 5)

Not a notification change, but completed in the same release cycle. Ensures host names in notification payloads match canonical directory display names.

### Event Mapping Reference

| Trigger | Domain event | In-app | Email | Recipients |
|---------|--------------|--------|-------|------------|
| Check-in | `VISITOR_ARRIVED` | ✅ | V, H | Host, branch admins |
| Force check-in | `VISITOR_ARRIVED` + `SECURITY_OVERRIDE` | ✅ | V, H, PA | Host, admins, platform |
| Check-out | `VISIT_COMPLETED` | ✅ | V | Host |
| Approval required | `APPROVAL_REQUEST` | ✅ | Approvers | Approvers |
| Pending > 15 min | `APPROVAL_REMINDER` | ✅ | Approvers | Approvers |
| Approved | `VISIT_APPROVED` | ✅ | V | Host, approvers |
| Rejected | `VISIT_REJECTED` | ✅ | V | Host, approvers |
| Cancelled | `VISIT_CANCELLED` | ✅ | V | Host |
| Org request | `ORG_ONBOARDING_REQUESTED` | ✅ | — | Platform admin |
| Org suspended | `ORG_SUSPENDED` | ✅ | PA | Platform admin |

### Key Files

```
lib/notifications/
  types.ts, categories.ts, event-mapper.ts, recipients.ts
  projector.ts, platform-projector.ts, dispatcher.ts, index.ts
  async-job-runner.ts
  queue/          — producer, retry, in-memory-notification-queue
  worker/         — notification.worker, in-app-delivery, email-delivery
  email/          — templates, builder, renderer, types
  channels/       — email.channel, microsoft-graph.email, smtp.transport, external.channels

lib/services/notification.service.ts
components/notifications/  — bell, dropdown, center page
```

---

## SECTION 7 — EMAIL SYSTEM

### Delivery Architecture

```
TransactionalEmailPayload
        │
        ▼
renderTransactionalEmail()  — HTML + text from templates
        │
        ▼
deliverTransactionalEmail()
        │
        ├── 1. Microsoft Graph (if GRAPH_* configured)
        │      sendViaMicrosoftGraph() via app-only token
        │
        ├── 2. SMTP fallback (if SMTP_* configured)
        │      nodemailer transport
        │
        └── 3. Console (dev only, non-production)
        │
        ▼
EmailDeliveryLog (idempotency) / EmailFailureLog (DLQ audit)
```

### Microsoft Graph Integration

**Files:** `lib/integrations/microsoft/graph-auth.ts`, `graph-config.ts`, `lib/notifications/channels/microsoft-graph.email.ts`

**Env vars:** Graph tenant/client credentials, sender email (`GRAPH_SENDER_EMAIL`)

Sends via `POST /users/{sender}/sendMail` with app-only OAuth token.

### SMTP Fallback

**File:** `lib/notifications/channels/smtp.transport.ts`

**Env vars:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Used when Graph is unavailable or fails. TLS required by default.

### Email Categories

| Category | Templates / Senders | Trigger |
|----------|---------------------|---------|
| **Visitor emails** | `VISITOR_*` templates | Visit lifecycle events |
| **Approval emails** | `APPROVAL_REQUEST`, `APPROVAL_REMINDER` | Pending approval |
| **Invite emails** | `invite-email.ts` | Member/org invite |
| **Platform alerts** | `platform-email.builder.ts` | Org lifecycle, security |
| **Organization alerts** | Org admin recipients via event mapper | Security override, force check-in |
| **Host alerts** | `HOST_VISITOR_ARRIVED` | Visitor check-in |

### Idempotency & Retry

- `EmailDeliveryLog.idempotencyKey` — prevents duplicate sends
- Failed deliveries logged to `EmailFailureLog` with full payload
- Notification job retry engine re-attempts with backoff
- Jobs exceeding max retries → `NotificationDlq`

### Admin Email Test

`POST /api/v1/admin/email/test` — platform admin can verify Graph/SMTP configuration.

---

## SECTION 8 — DASHBOARDS

### Operational Dashboard (`/` / `/dashboard`)

**Component:** `components/dashboard/operational-dashboard.tsx`, `dashboard-content.tsx`

| Widget | File | Data source |
|--------|------|-------------|
| KPI strip | `dashboard-kpi-strip.tsx` | Reception/analytics APIs |
| Operational summary | `dashboard-operational-summary.tsx` | Live visit counts |
| Recent activity | `dashboard-recent-activity.tsx`, `dashboard-activity-feed.tsx` | Activity stream |
| Visitor trends | `dashboard-visitor-trends.tsx` | Analytics time series |
| Top hosts | `dashboard-top-hosts.tsx` | `GET /api/v1/analytics/hosts` |
| Checked-in panel | `checked-in-panel.tsx` | Active visits |
| Duplicate alerts | `duplicate-alerts-panel.tsx` | Duplicate detection |
| Recent visits | `recent-visits-table.tsx` | Visit list |
| Quick actions | `quick-actions.tsx`, `dashboard-fast-actions.tsx` | Navigation shortcuts |

**Permission:** `visitor:read`

### Reception Console (`/reception`, `/dashboard/reception`)

**Component:** `components/reception/reception-command-center.tsx`

**Tabs:**
1. **Command Center** (default) — metrics, operational queues, recent visitors
2. **Check-in** — QR scan, manual lookup
3. **Operations** — rescue queue, duplicate review, override guidance

**Operational queues:** pending approvals, expected arrivals, checked-in visitors, overdue visitors

**API:** `GET /api/v1/reception/dashboard`, `GET /api/v1/reception/recent-visitors`

### Admin Dashboard (`/admin/dashboard`)

**Platform-scoped** — aggregate org/visitor/visit counts, recent org requests, system health indicators.

**API:** `GET /api/v1/admin/dashboard`

### Analytics (`/analytics`)

**Permission:** `visitor:read`

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/analytics/dashboard` | Main KPIs and trends |
| `GET /api/v1/analytics/hosts` | Host performance |
| `GET /api/v1/analytics/branches` | Branch breakdown |
| `GET /api/v1/analytics/audit` | Audit event analytics (`audit:read`) |
| `GET /api/v1/analytics/export` | CSV export |
| `POST /api/v1/internal/analytics-snapshots` | Snapshot generation (internal) |

**Snapshots:** `AnalyticsSnapshot` table — precomputed daily/weekly/monthly for dashboard, branch, host, audit types.

### Host Dashboard Components

Host analytics appear in:
- `/hosts` — per-host visit counts and detail drawer
- Dashboard `dashboard-top-hosts.tsx` — ranked hosts by visit volume
- Visit tables — `resolveHostDisplayName()` for consistent host labels

---

## SECTION 9 — KIOSK

**Route:** `/kiosk`  
**Layout:** `(kiosk)` route group — minimal chrome, branch-scoped operational context

### Flow Phases

```
details → identity-resolution → capture → review → approval-pending → badge → result
```

**Component:** `components/kiosk/kiosk-register-flow.tsx`

### Visitor Search (Returning)

**Component:** `kiosk-returning-visitor-search.tsx`

- Searchable dropdown by name, email, phone
- Selected visitor preview card
- Visit details below search result

### New Visitor

**Component:** `kiosk-register-form.tsx`

- Compact form: personal + visit fields
- Email OR phone required
- **Host picker inline** (`HostPickerWithOther`) — no separate host step
- Branch selection loaded from operational context

### Existing Visitor

Returning visitor mode reuses search → pre-fills identity → visit details + host selection.

### Host Selection

- Sources from `listActiveHosts()` via host directory API
- **Other host** option with custom name/department/email
- `resolveHostForVisitSubmission()` encodes selection for API

### QR Check-In

- Server-side QR verification via `POST /api/v1/visits/qr/resolve`
- HMAC + expiry + tenant validation
- States: `APPROVED`, `PENDING`, `APPROVAL_REQUIRED`, `CHECKED_IN`
- Approval polling with timeout (12s resolve, approval-wait phase)
- Recovery: `KioskQrRecoverPanel`, retry with backoff

### Approval Handling

**Component:** `kiosk-approval-pending.tsx`

- Polls visit status while `PENDING`
- `completeKioskApprovalOutcome()` on approval
- `kioskApprovalRejectionOutcome()` on rejection
- No known dead-end states (Phase 1.4)

### Policy Enforcement

Server-authoritative via `enforceVisitCheckInPolicy()`:
- Visit hours, photo required, documents required, kiosk enabled
- Client displays policy errors; server is source of truth

### Kiosk Operational Context

`useKioskOperational()` — branch settings, operational policy, feature flags for the kiosk session.

---

## SECTION 10 — SECURITY

### Tenant Isolation

| Layer | Mechanism |
|-------|-----------|
| Schema | `organizationId` on all tenant tables |
| Middleware | JWT org ID, status check, path mismatch detection |
| API | `withTenant` → `requireTenantContext()` |
| Session | `validateTenantSession()` — DB re-check per request |
| Service | `ctx.organizationId` on every query |
| Guards | `assertBranchInTenant`, `assertHostInTenant` |

### RBAC

- Global permission catalog, org-scoped roles
- `enforcePermission()` in services (authoritative)
- `filterNavItemsForPermissions()` + `RoutePermissionGuard` (UI)
- Self-disable blocked; role changes audited

### Middleware Protection

- Unauthenticated → redirect `/login` or `401` for APIs
- Platform admin paths → role check
- Platform admin without org → blocked from tenant paths
- Unapproved org → `403 ORGANIZATION_NOT_APPROVED`
- Cross-tenant URL → `403 TENANT_MISMATCH`

### API Protection

- All `/api/v1/*` tenant routes use `withTenant` wrappers
- Admin routes use platform admin guard
- Public routes explicitly allowlisted
- Rate limits: check-in/out 30/min, search 20/min, login 5/15min per email+IP

### Session Validation

`validateTenantSession()` verifies on each API call:
- User still exists and is active
- Membership still active (`status: ACTIVE`, `isActive: true`)
- Organization still approved (not suspended/deleted)

### Cross-Tenant Prevention

- Forged `x-organization-id` headers stripped
- Resource lookups always include `organizationId`
- Cross-tenant IDs return not-found, never foreign data

### Platform Admin Isolation

- Separate `/admin/*` portal
- Cannot access tenant APIs without org membership in JWT
- Aggregate metrics only — no tenant workflow mutation except suspend/reactivate

### Audit Findings

| Document | Result |
|----------|--------|
| `TENANT-SCOPING-AUDIT.md` | 33 services compliant; 1 branch settings fix |
| `SECURITY-VALIDATION.md` | T1–T8, U1–U6, P1–P8, S1–S3 all pass |
| `NOTIFICATION-COVERAGE-AUDIT.md` | Event coverage complete for operational flows |

---

## SECTION 11 — CURRENT ROUTES

### Auth

| Route | Purpose |
|-------|---------|
| `/login` | Credentials sign-in |
| `/signup` | Registration (legacy; onboarding prefers request-access) |
| `/request-access` | Public org access request |
| `/request-access/received` | Request confirmation |
| `/setup-password` | Initial password from invite token |
| `/invite/[token]` | Invite preview |
| `/accept-invite` | Invite acceptance |
| `/onboarding` | Onboarding shell |

### Admin (Platform)

| Route | Purpose |
|-------|---------|
| `/admin` | Admin root redirect |
| `/admin/dashboard` | Platform dashboard |
| `/admin/org-requests` | Review access requests |
| `/admin/organizations` | Organization list |
| `/admin/organizations/[id]` | Organization detail, suspend/reactivate |

### Organizations (Tenant Settings)

| Route | Permission |
|-------|------------|
| `/settings/users` | `user:manage` |
| `/settings/invites` | `invite:list` |
| `/settings/branches` | `branch:manage` |
| `/settings/branches/[branchId]` | `branch:manage` |
| `/dashboard/settings` | `visitor:read` |

### Hosts

| Route | Permission |
|-------|------------|
| `/hosts` | `user:manage` |

### Visitors

| Route | Permission |
|-------|------------|
| `/visitors` | `visitor:read` |
| `/dashboard/visitors` | `visitor:read` |

### Visits

| Route | Permission |
|-------|------------|
| `/visits` | `visitor:read` |
| `/visits/new` | `visitor:create` |
| `/dashboard/visits` | `visitor:read` |
| `/approvals` | Approval permissions (not in sidebar; route exists) |

### Reception

| Route | Permission |
|-------|------------|
| `/reception` | `visit:check_in` or `visitor:read` |
| `/dashboard/reception` | Same |

### Kiosk

| Route | Access |
|-------|--------|
| `/kiosk` | Authenticated tenant user with branch context |

### Analytics

| Route | Permission |
|-------|------------|
| `/analytics` | `visitor:read` |

### Notifications

| Route | Permission |
|-------|------------|
| `/notifications` | `visitor:read` |

### Dashboard

| Route | Permission |
|-------|------------|
| `/` | `visitor:read` |
| `/dashboard` | `visitor:read` |

### API Route Inventory (Summary)

**Public:**
- `POST /api/public/org-requests`
- `POST /api/auth/[...nextauth]`
- `GET/POST /api/v1/invites/[token]`, `POST /api/v1/invites/accept`
- `GET/POST /api/v1/auth/setup-password/*`

**Admin (9 routes):**
- `/api/v1/admin/dashboard`
- `/api/v1/admin/org-requests`, `.../approve`, `.../reject`
- `/api/v1/admin/organizations`, `.../[id]`, `.../suspend`, `.../reactivate`
- `/api/v1/admin/email/test`

**Tenant (~56 routes):**
- Visitors: 12 routes under `/api/v1/visitors/*`
- Visits: 14 routes under `/api/v1/visits/*`
- Organizations: members, invites, roles, hosts
- Reception: 2 routes
- Analytics: 5 routes
- Notifications: 3 routes
- Settings: 3 routes
- Branches: 2 routes
- Approvals: 1 route
- Activity: 1 route
- Search: 1 route

---

## SECTION 12 — DATABASE INVENTORY

### Platform-Scoped Tables

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `users` | Global identity (NextAuth) | → accounts, sessions, memberships |
| `accounts` | OAuth/credential accounts | → user |
| `sessions` | NextAuth sessions | → user |
| `verification_tokens` | Email verification | — |
| `permissions` | Global permission catalog | → role_permissions |
| `organization_requests` | Onboarding requests | → approver user |
| `plans` | Subscription plan definitions | → subscriptions |

### Tenant-Scoped Tables

| Table | Purpose | Key relationships |
|-------|---------|-------------------|
| `organizations` | Tenant root | → all tenant data |
| `organization_members` | User ↔ org membership | → user, role, hosted visits |
| `organization_invites` | Pending invites | → org, role, inviter |
| `roles` | Org-scoped RBAC roles | → permissions, members |
| `role_permissions` | Role ↔ permission (denormalized orgId) | → org, role, permission |
| `branches` | Physical locations | → org, visits, settings |
| `branch_settings` | Branch operational config | → branch, org |
| `organization_settings` | Org branding + policy flags | → org |
| `feature_flags` | Per-org feature toggles | → org |
| `visitors` | Person identity per org | → org, visits, notes |
| `visitor_notes` | Operational notes on visitors | → visitor, org, author |
| `visits` | Visit records | → org, branch, visitor, host member |
| `visit_approvals` | Approval workflow | → visit, approver member |
| `visit_events` | Visit timeline/audit | → visit, org, actor |
| `app_notifications` | In-app notification inbox | → org, user |
| `email_delivery_logs` | Email idempotency + status | → org |
| `email_failure_logs` | Failed email audit | → org |
| `notification_jobs` | Async notification queue | → org |
| `notification_dlq` | Dead letter queue | → org |
| `audit_logs` | Append-only audit trail | → org, actor |
| `analytics_snapshots` | Precomputed analytics | → org |
| `subscriptions` | Billing (schema ready) | → org, plan |
| `usage_records` | Usage metering (schema ready) | → org, subscription |

### Tenant Boundary Rule

Every table with `organizationId` must filter by `ctx.organizationId` in services. Exceptions:
- `users`, `permissions`, `plans` — global
- `organization_requests` — platform workflow
- Platform admin reads use dedicated service with explicit cross-tenant scope

### Major Relationships

```
Organization
  ├── OrganizationMember → User
  │     └── hostedVisits (Visit.hostMemberId)
  ├── Branch → Visit
  ├── Visitor → Visit
  │     └── VisitApproval
  ├── Role → RolePermission → Permission
  ├── AppNotification → User
  └── AuditLog → User (actor)
```

---

## SECTION 13 — KNOWN LIMITATIONS

Only documented gaps that reflect actual codebase state:

| Limitation | Detail |
|------------|--------|
| **Department stored client-side** | Host department in `localStorage` via `host-department-store.ts`; not persisted server-side |
| **Billing not implemented** | `Subscription`, `Plan`, `UsageRecord` schema exists; no Stripe integration or billing UI |
| **Subscription plans not implemented** | `requestedPlan` captured on org request but not enforced |
| **Teams integration pending** | `teams` channel stub only (`external.channels.ts`) |
| **WhatsApp integration pending** | `whatsapp` channel stub only |
| **SMS integration pending** | `sms` channel stub; `smsEnabled` org setting unused |
| **Slack integration pending** | `slack` channel stub only |
| **Visitor self-service portal not implemented** | No public visitor login or visit management portal |
| **Org switcher not wired** | UI placeholder; single org per session |
| **Host directory not HOST-role filtered** | Returns all active members, not strictly `host` role slug |
| **Notification queue in-process** | Postgres-durable jobs but drain/retry in app process (no Redis/separate worker) |
| **WebSocket push not implemented** | Notification bell uses 30s polling |
| **Approvals removed from sidebar** | `/approvals` route exists; reception handles approvals inline |
| **Photo/document storage** | Policy enforced; persistent cloud storage not built |
| **Cron-based approval reminders** | Lazy reminder on `GET /notifications` instead of scheduled job |
| **Kiosk session failure auto-detect** | Mapper ready; hook pending when kiosk session service exists |
| **White-label / custom domains** | Not implemented |
| **OAuth providers** | Credentials only; Google/Microsoft OAuth planned |
| **Multi-org per user** | Schema supports multiple memberships; session model is single active org |

---

## SECTION 14 — NEXT RECOMMENDED PHASES

Recommended roadmap in priority order:

### 1. Billing & Subscription Management

- Wire Stripe to existing `Subscription` / `Plan` / `UsageRecord` schema
- Enforce plan limits (visitors, branches, users)
- Self-service upgrade/downgrade in org settings
- Usage metering and invoicing

### 2. Organization Settings & Branding

- Full settings UI for `OrganizationSettings` (logo, colors, welcome message)
- Email notification toggles per event type
- Branch operational policy editor
- Persist host department server-side

### 3. Advanced Reporting

- Scheduled report delivery
- Custom date ranges and filters
- Export formats beyond CSV
- Compliance/audit report packs

### 4. Visitor Self-Service Portal

- Public visitor login (magic link)
- Pre-registration and visit status tracking
- QR download and calendar integration
- Visitor-facing notification preferences

### 5. Mobile Experience

- Responsive polish for reception and kiosk
- PWA / native shell for security staff
- Push notifications (replace polling)

### 6. Enterprise Integrations

- Microsoft Teams / Slack webhooks per org
- Twilio SMS/WhatsApp
- SCIM provisioning
- SSO (SAML/OIDC)
- Webhook outbound for visit events

### 7. White-Label Support

- Custom domains per tenant
- Branded email templates per org
- Configurable terminology
- Platform reseller model

---

## Appendix — Key File Index

```
middleware.ts
lib/tenant/middleware-org-resolution.ts
lib/auth/validate-tenant-session.ts
lib/auth/session.ts
lib/rbac/roles.ts, permissions.ts, enforce.ts, navigation.ts
lib/hosts/host-directory.ts, host-selection.ts, display.ts, host-department-store.ts
lib/services/organization-request-approval.service.ts
lib/services/member.service.ts, invite.service.ts
lib/services/internal/tenant-guards.ts
lib/notifications/  (full tree)
lib/integrations/microsoft/
prisma/schema.prisma
docs/TENANT-SCOPING-AUDIT.md
docs/SECURITY-VALIDATION.md
docs/NOTIFICATION-COVERAGE-AUDIT.md
```

---

*End of Phase 7 Platform Snapshot — June 2026*
