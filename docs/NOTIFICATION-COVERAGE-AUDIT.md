# Notification Coverage Audit (Phase 6.8)

Audit date: 2026-06-15  
Architecture: `emitNotification()` / `emitPlatformNotification()` → `mapEventToNotifications()` / `mapPlatformEventToNotifications()` → in-app + email channels.

## Recipient legend

| Code | Meaning |
|------|---------|
| V | Visitor (email) |
| H | Host (in-app + email where noted) |
| OA | Organization admin / owner |
| PA | Platform admin (`PLATFORM_ADMIN` / `SYSTEM_OWNER`) |
| SEC | Security role |
| BA | Branch admin |

## Event matrix (after fixes)

| Event | In-app | Email | Recipients |
|-------|--------|-------|------------|
| `VISITOR_ARRIVED` (check-in) | Yes | V (`VISITOR_CHECKED_IN`), H (`HOST_VISITOR_ARRIVED`) | H, BA |
| `VISITOR_ARRIVED` (force) | Yes | V, H, PA (`PLATFORM_FORCE_CHECKIN`) | H, BA, OA, PA |
| `VISIT_COMPLETED` (check-out) | Yes | V (`VISITOR_CHECKED_OUT`) | H |
| `APPROVAL_REQUEST` | Yes | Approvers (`APPROVAL_REQUEST`) | Approvers |
| `APPROVAL_REMINDER` | Yes | Approvers (`APPROVAL_REMINDER`) | Approvers |
| `VISIT_APPROVED` | Yes | V (`VISITOR_APPROVED`) | Approvers, H |
| `VISIT_REJECTED` | Yes | V (`VISITOR_REJECTED`) | Approvers, H |
| `VISIT_CANCELLED` | Yes | V (`VISITOR_CANCELLED`) | H |
| `SECURITY_OVERRIDE` | Yes | PA (`PLATFORM_SECURITY_OVERRIDE`) | SEC, OA, PA |
| `ORG_ONBOARDING_REQUESTED` | Yes | PA | PA |
| `ORG_APPROVED` | Yes | PA (+ contact setup email via existing approval flow) | PA |
| `ORG_REJECTED` | Yes | PA (+ contact rejection email via existing flow) | PA |
| `ORG_SUSPENDED` | Yes | PA | PA |
| `DUPLICATE_DETECTED` (HIGH) | Yes | PA | PA |
| `KIOSK_SESSION_FAILED` (≥3 failures) | Yes | PA | PA |

## Gaps fixed in this phase

| Gap | Before | After |
|-----|--------|-------|
| Platform admin on org lifecycle | Audit only / direct contact emails | `emitPlatformNotification()` + mapper |
| Platform admin on security override | SEC only | SEC + OA + PA (in-app + email) |
| Platform admin on force check-in | H + BA only | H + BA + OA + PA |
| Host on approve/reject in-app | Approvers only | Approvers + H |
| Host arrival email | Missing | `HOST_VISITOR_ARRIVED` template |
| Org suspend | Audit only | PA in-app + email |
| Duplicate HIGH confidence | Audit only | PA in-app + email on review |

## Intentionally unchanged (no workflow changes)

| Event | Notes |
|-------|-------|
| `USER_INVITED` / `USER_ROLE_CHANGED` / `USER_DISABLED` | Invite email remains `invite-email.ts`; no duplicate in-app path added |
| `KIOSK_SESSION_FAILED` auto-detect | Mapper + emitter ready; hook when kiosk session service exists |
| `DUPLICATE_DETECTED` auto-detect | Fires on HIGH-confidence group review (admin action), not on every scan |
| `RESCUE_FLOW_TRIGGERED` | No domain event in codebase yet |

## Single source of truth

- **Tenant events:** `emitNotification()` → `mapEventToNotifications()` → `buildAndEnqueueTransactionalEmails()` + `buildAndEnqueuePlatformAdminAlertEmails()`
- **Platform events:** `emitPlatformNotification()` → `mapPlatformEventToNotifications()` → `buildAndEnqueuePlatformEmails()`
- **Recipients:** `lib/notifications/recipients.ts` (`resolvePlatformAdminRecipients`, `resolveOrgAdminUserIds`, etc.)
- **No duplicate service-level email** for org lifecycle platform alerts; contact-facing emails remain in `approval-email.ts`

## Platform admin resolution

`resolvePlatformAdminRecipients()` queries active users with `systemRole IN (PLATFORM_ADMIN, SYSTEM_OWNER)`, tenant-independent, cached 5 minutes.

In-app notifications for platform admins are stored under `default-org` so they appear in the default organization context.

## Validation

```bash
npx tsc --noEmit
```
