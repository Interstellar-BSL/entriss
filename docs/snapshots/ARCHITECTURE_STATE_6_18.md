# Architecture State — Phase 6.18 Baseline

**Date:** 2026-06-17  
**Scope:** Ground-truth architecture as of Phase 6.18 baseline (code-audited summary)

---

## 1. Multi-Tenant Architecture

### Isolation approach

Entriss uses a **shared PostgreSQL database** with a **shared Prisma schema**. Every tenant-owned record includes `organizationId`. There is no application-level cross-tenant data access.

```
Organization (tenant root)
  ├── Branches (locations, timezone, operational policy)
  ├── OrganizationMember → User (membership + role)
  ├── Visitors, Visits, Badges, Notifications, Audit logs
  └── OrganizationSettings (branding, policies)
```

### Tenant resolution

1. User authenticates via NextAuth (credentials).
2. JWT session carries `userId`, `organizationId`, `role`, `organizationStatus`.
3. Middleware validates session, org approval (`APPROVED`), and path/org alignment.
4. Tenant APIs use `withTenant` → `validateTenantSession()` → service methods with `TenantContext`.

### Tenant guards (defense in depth)

| Layer | Mechanism |
|-------|-----------|
| Middleware | Blocks unapproved/suspended orgs; rejects tenant path mismatch |
| Header stripping | Client `x-organization-id` ignored; JWT wins |
| `withTenant` wrapper | Required on tenant API routes |
| Service layer | `ctx.organizationId` on all queries |
| Internal guards | `assertBranchInTenant`, `assertHostInTenant` |
| RBAC | `enforcePermission(ctx, PERMISSIONS.*)` |
| UI | `RoutePermissionGuard`, permission-filtered sidebar |

### Permission model

- **Global permission catalog** — seeded once (`Permission` table)
- **Org-scoped roles** — `Role` + `RolePermission` per organization
- **System roles** — created via `createOrganizationDefaults()` (org admin, reception, host, etc.)
- **Platform admin** — `isPlatformAdmin()`; separate admin routes under `/admin`
- **Enforcement** — server-side in services; UI guards are supplementary

**Key permissions (examples):**

| Permission | Typical use |
|------------|-------------|
| `visitor:read` | Host directory, visitor lists |
| `visitor:create` | Schedule visit, walk-in register |
| `visit:checkin` | Reception/kiosk check-in |
| `user:manage` | Host management, team settings |
| `settings:manage` | Org/branch/branding settings |
| `analytics:read` | Dashboard, exports |

---

## 2. Host Management

### Canonical host directory

**Module:** `lib/hosts/host-directory.ts`

| API function | Behavior |
|--------------|----------|
| `listActiveHosts(ctx)` | All active org members, sorted by name |
| `getHostById(ctx, hostMemberId)` | Single active member |
| `searchHosts(ctx, query)` | Name/email search (cap 25) |

**Active host criteria:**

- `organizationMember.isActive === true`
- `status === ACTIVE`
- `deactivatedAt === null`
- `user.isActive === true`

**HTTP API:**

- `GET /api/v1/organizations/hosts` — list/search
- `POST /api/v1/organizations/hosts` — create (assigns HOST role)
- `GET /api/v1/organizations/hosts/[hostMemberId]` — detail

### Host role

- HOST role auto-assigned on host creation (`createOrganizationHost` in `member.service.ts`)
- Directory returns **all active members**, not strictly HOST-role-filtered (any active member can be selected as host)
- Deactivation via `disableMember()` removes host from pickers; `assertHostInTenant` rejects on visit create

### Host picker unification

**Shared component:** `components/hosts/host-picker-with-other.tsx`  
**Selection model:** `lib/hosts/host-selection.ts`

| Mode | Storage |
|------|---------|
| `MEMBER` | `visit.hostMemberId` → canonical directory entry |
| `OTHER` | Custom name/dept/email in `visitor.notes` JSON or purpose suffix; proxy `hostMemberId` |

**Surfaces:**

| Surface | Integration |
|---------|-------------|
| Schedule Visit | `new-visit-form.tsx` |
| Reception walk-in | `quick-register.tsx` |
| Kiosk registration | `kiosk-register-form.tsx` |

**Display:** `lib/hosts/display.ts` — consistent host labels across dashboard, visits, reception, approvals, kiosk.

### Known limitation

Host **department** is stored in browser `localStorage` (`host-department-store.ts`), not in the database.

---

## 3. Visits

### Schedule flow

1. Staff opens `/visits/new`
2. Selects branch, host (`HostPickerWithOther`), visitor (new or existing), schedule time
3. `POST /api/v1/visits` — server validates tenant, host, branch, policies
4. Visit statuses: `PENDING`, `APPROVAL_REQUIRED`, `APPROVED`, `CHECKED_IN`, `CHECKED_OUT`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

### Kiosk flow

```
Home → QR | Find Booking | New Visitor
  → identity confirm → capture (photo/docs) → review
  → approval-pending (poll) → badge → result
```

- Operational snapshot loaded once per session (`kiosk-shell.tsx`)
- Server policy: `enforceVisitCheckInPolicy` on check-in
- QR: `POST /api/v1/visits/qr/resolve` — HMAC verify, no client trust of raw visitId
- State parity with reception (approval-wait, recovery panels, retry)

### Reception flow

- **Command Center** — dashboard KPIs, pending approvals, overdue, walk-ins
- **QR scanner** — server verify → check-in/out with policy gates
- **Manual lookup** — search today's arrivals / pending approvals
- **Quick register** — walk-in with host picker
- **Force check-in/out** — override modal with reason + audit trail

### Approvals

- Host or designated approver receives notification
- `APPROVAL_REQUIRED` / `PENDING` states block check-in until approved
- Reception and kiosk poll approval status
- Approvals page (`/approvals`) for staff queue management

---

## 4. Branding

### Entriss platform branding

- **Sidebar top:** `PlatformLogo` (Entriss mark only)
- **Auth login:** `PlatformLogo` on login/signup pages
- Default tokens in `app/globals.css` when no org context

### Organization branding

**Storage:** `OrganizationSettings` — `logoUrl`, `primaryColor`, `secondaryColor`, `welcomeMessage`, `themeMode`

**Resolution:** `lib/branding/resolve.ts` → `ResolvedOrgBranding`

**Runtime injection:** `OrgBrandingProvider` sets on `<html>`:

- `--brand-primary`, `--brand-secondary`, `--brand-primary-hover`
- `data-org-theme` = `light` | `dark` | `system`
- `data-org-id` when authenticated

**UI hierarchy:**

| Location | Component |
|----------|-----------|
| Header | `OrgLogo` + org name + role |
| Sidebar footer | Organization name |
| Kiosk home | `KioskLogo` + welcome message |
| Settings | `BrandingSettingsPanel` + `LogoPicker` |

### Theme system

**Base tokens** (`app/globals.css`):

```
--background, --foreground, --card, --surface-muted, --border, --muted
--brand-primary, --brand-primary-hover, --brand-secondary, --on-brand
--link, --ring, --danger, --danger-hover
```

**Dark mode:** `[data-org-theme="dark"]` and `[data-org-theme="system"]` + `prefers-color-scheme`

**Component usage:** `Button`, `Card`, `Badge`, data tables, reception/kiosk shared tokens

### Logo upload/cropping

- `components/branding/logo-picker.tsx` — drag/drop, preview, center-crop to 256×256
- `lib/branding/logo-image.ts` — canvas crop utility
- Stored as HTTPS URL or data URL string (no separate file upload API)
- Validation in `lib/validations/settings.ts`

---

## 5. Timezone

### Branch timezone model

- `Branch.timezone` — IANA string (default `UTC`)
- Curated picker: `lib/settings/branch-timezones.ts`
- Branch settings UI: operational config per branch

### Visit-hour enforcement

**Policy module:** `lib/server/policies/visit-checkin.policy.ts`

1. Load branch operational settings (start/end minutes, enabled flag)
2. Resolve "now" in **branch timezone** via `evaluateVisitHours`
3. Reject check-in with `OUTSIDE_VISIT_HOURS` if outside window

**Applied on:** kiosk check-in, reception check-in, QR resolve check-in paths (server-side).

**Fix (Phase 6.x):** Visit hours evaluated in branch local time, not server UTC.

---

## 6. Badge Printing

### Current implementation

| Piece | Location |
|-------|----------|
| Print HTML builder | `lib/kiosk/badge-print-html.ts` |
| Print CSS | `lib/kiosk/badge-print-styles.ts` |
| Print trigger | Kiosk result flow, reception print action, visit drawer |
| Print root | `#badge-print-root` in DOM; `@media print` rules in `globals.css` |

**Flow:**

1. Visit checked in → badge code + QR generated server-side
2. Client renders badge preview HTML
3. `window.print()` with isolated print stylesheet
4. Print status updated on visit record

### Known limitations

- Badge print UI components (`kiosk-badge-panel`, `kiosk-badge-details-panel`, `kiosk-inline-badge`) **not fully theme-tokenized** (excluded from 6.17/6.18 pass)
- Print styles use fixed hex colors for reliable print output
- Browser print dialog behavior varies by OS/kiosk hardware
- No cloud print queue or label-printer driver integration

---

## 7. Application Structure (route groups)

| Group | Purpose |
|-------|---------|
| `(app)` | Authenticated tenant app (dashboard, visits, reception, settings, analytics) |
| `(admin)` | Platform admin console |
| `(auth)` | Login, signup, invite, request-access |
| `(kiosk)` | Full-screen kiosk mode |
| `(onboarding)` | New org setup |
| `app/api/v1/*` | Tenant REST API |
| `app/api/v1/admin/*` | Platform admin API |

---

## 8. Data Model Highlights

| Model | Tenant-scoped | Notes |
|-------|---------------|-------|
| `Organization` | Platform | Tenant root |
| `OrganizationMember` | Yes | User ↔ org + role |
| `Branch` | Yes | Timezone, operational JSON |
| `Visitor` | Yes | Persistent identity |
| `Visit` | Yes | Lifecycle + host + branch |
| `OrganizationSettings` | Yes | Branding + policies |
| `OrganizationRequest` | Platform | Registration queue |

Full schema: `prisma/schema.prisma`, documented in `docs/DATA-MODEL.md`.

---

## 9. Security Posture (summary)

Documented in `docs/SECURITY-VALIDATION.md` and `docs/TENANT-SCOPING-AUDIT.md`.

- Cross-tenant ID access → 404/not found
- Forged org headers → ignored
- Suspended org → middleware 403
- QR tokens → cryptographic verify before check-in
- RBAC enforced server-side on all mutating operations
