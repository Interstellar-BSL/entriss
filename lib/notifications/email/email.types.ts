export type TransactionalEmailType =
  | "VISITOR_APPROVED"
  | "VISITOR_CHECKED_IN"
  | "VISITOR_CHECKED_OUT"
  | "VISITOR_REJECTED"
  | "VISITOR_CANCELLED"
  | "APPROVAL_REQUEST"
  | "APPROVAL_REMINDER"
  | "HOST_VISITOR_ARRIVED";

export interface TransactionalEmailPayload {
  to: string;
  type: TransactionalEmailType;
  idempotencyKey: string;

  visitor: {
    name: string;
    email: string;
    phone?: string;
  };

  visit: {
    id: string;
    status: string;
    scheduledAt?: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    purpose?: string;
    visitReference?: string;
    rejectReason?: string;
    cancelReason?: string;
    visitDuration?: string;
  };

  host?: {
    name: string;
    email: string;
  };

  branch?: {
    name: string;
    address?: string;
  };

  organizationName?: string;
  organizationLogoUrl?: string;
  organizationPrimaryColor?: string;
  qrCode?: string;
  approvalUrl?: string;
  isReminder?: boolean;
}

export interface RenderedTransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
