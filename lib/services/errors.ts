import type { Visitor } from "@/app/generated/prisma/client";
import type { VisitStatus } from "@/app/generated/prisma/enums";

export class ServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

export type OrgApprovalStep =
  | "org_creation"
  | "role_assignment"
  | "user_creation"
  | "membership_creation"
  | "invite_creation"
  | "request_update";

export class OrgApprovalError extends ServiceError {
  readonly step: OrgApprovalStep;

  constructor(step: OrgApprovalStep, message: string) {
    super("ORG_APPROVAL_FAILED", message);
    this.name = "OrgApprovalError";
    this.step = step;
  }
}

export class VisitorNotFoundError extends ServiceError {
  constructor(identifier?: string) {
    super(
      "VISITOR_NOT_FOUND",
      identifier
        ? `Visitor not found: ${identifier}`
        : "Visitor not found",
    );
    this.name = "VisitorNotFoundError";
  }
}

export class VisitorNoteNotFoundError extends ServiceError {
  constructor(noteId?: string) {
    super(
      "VISITOR_NOTE_NOT_FOUND",
      noteId
        ? `Visitor note not found: ${noteId}`
        : "Visitor note not found",
    );
    this.name = "VisitorNoteNotFoundError";
  }
}

export class VisitorIdentityConflictError extends ServiceError {
  readonly visitor: Visitor;

  constructor(visitor: Visitor) {
    super(
      "VISITOR_IDENTITY_CONFLICT",
      "A visitor with this email or phone already exists",
    );
    this.name = "VisitorIdentityConflictError";
    this.visitor = visitor;
  }
}

export class VisitNotFoundError extends ServiceError {
  constructor(visitId?: string) {
    super(
      "VISIT_NOT_FOUND",
      visitId ? `Visit not found: ${visitId}` : "Visit not found",
    );
    this.name = "VisitNotFoundError";
  }
}

export class BranchNotFoundError extends ServiceError {
  constructor(branchId?: string) {
    super(
      "BRANCH_NOT_FOUND",
      branchId ? `Branch not found: ${branchId}` : "Branch not found",
    );
    this.name = "BranchNotFoundError";
  }
}

export class HostNotFoundError extends ServiceError {
  constructor(hostMemberId?: string) {
    super(
      "HOST_NOT_FOUND",
      hostMemberId
        ? `Host member not found: ${hostMemberId}`
        : "Host member not found in this organization",
    );
    this.name = "HostNotFoundError";
  }
}

export class InvalidVisitTransitionError extends ServiceError {
  constructor(from: VisitStatus, to: VisitStatus) {
    super(
      "INVALID_VISIT_TRANSITION",
      `Invalid visit status transition: ${from} → ${to}`,
    );
    this.name = "InvalidVisitTransitionError";
  }
}

export class InvalidQRTokenError extends ServiceError {
  constructor(message = "Invalid or tampered QR token") {
    super("INVALID_QR_TOKEN", message);
    this.name = "InvalidQRTokenError";
  }
}

export class ExpiredQRTokenError extends ServiceError {
  constructor() {
    super("EXPIRED_QR_TOKEN", "QR token has expired");
    this.name = "ExpiredQRTokenError";
  }
}

export class VisitCheckInError extends ServiceError {
  constructor(message: string) {
    super("VISIT_CHECK_IN_ERROR", message);
    this.name = "VisitCheckInError";
  }
}

export class VisitCheckOutError extends ServiceError {
  constructor(message: string) {
    super("VISIT_CHECK_OUT_ERROR", message);
    this.name = "VisitCheckOutError";
  }
}

export class WalkInsNotAllowedError extends ServiceError {
  constructor() {
    super("WALK_INS_NOT_ALLOWED", "Walk-in visitors are not allowed at this location");
    this.name = "WalkInsNotAllowedError";
  }
}

export class ManualCheckInNotAllowedError extends ServiceError {
  constructor() {
    super(
      "MANUAL_CHECK_IN_NOT_ALLOWED",
      "Manual check-in override is disabled for this organization",
    );
    this.name = "ManualCheckInNotAllowedError";
  }
}

export class QrCheckInRequiredError extends ServiceError {
  constructor() {
    super("QR_REQUIRED", "QR code is required for check-in at this organization");
    this.name = "QrCheckInRequiredError";
  }
}

export class QrCheckInDisabledError extends ServiceError {
  constructor() {
    super(
      "QR_CHECK_IN_DISABLED",
      "QR check-in is not enabled for this organization",
    );
    this.name = "QrCheckInDisabledError";
  }
}
