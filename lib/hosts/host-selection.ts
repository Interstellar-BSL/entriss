import type { HostDirectoryEntry } from "@/lib/hosts/types";

export const HOST_SELECTION_MODE_MEMBER = "MEMBER" as const;
export const HOST_SELECTION_MODE_OTHER = "OTHER" as const;

export type HostSelectionMode =
  | typeof HOST_SELECTION_MODE_MEMBER
  | typeof HOST_SELECTION_MODE_OTHER;

export interface OtherHostDetails {
  mode: typeof HOST_SELECTION_MODE_OTHER;
  requestedHostName: string;
  requestedHostDepartment?: string;
  requestedHostEmail?: string;
}

export type HostSelection =
  | {
      mode: typeof HOST_SELECTION_MODE_MEMBER;
      hostMemberId: string;
      host: HostDirectoryEntry;
    }
  | OtherHostDetails;

export interface ResolvedHostVisitFields {
  hostMemberId: string;
  purpose?: string;
  visitorNotes?: string;
}

const OTHER_HOST_JSON_PREFIX = '{"hostSelectionMode":"OTHER"';

export function isHostSelectionComplete(
  selection: HostSelection | null | undefined,
): selection is HostSelection {
  if (!selection) {
    return false;
  }

  if (selection.mode === HOST_SELECTION_MODE_MEMBER) {
    return Boolean(selection.hostMemberId);
  }

  return selection.requestedHostName.trim().length > 0;
}

export function getHostSelectionLabel(selection: HostSelection | null): string {
  if (!selection) {
    return "—";
  }

  if (selection.mode === HOST_SELECTION_MODE_MEMBER) {
    return selection.host.name;
  }

  return selection.requestedHostName.trim();
}

export function encodeOtherHostVisitorNotes(
  details: OtherHostDetails,
  existingNotes?: string,
): string {
  const payload = JSON.stringify({
    hostSelectionMode: HOST_SELECTION_MODE_OTHER,
    requestedHostName: details.requestedHostName.trim(),
    ...(details.requestedHostDepartment?.trim()
      ? { requestedHostDepartment: details.requestedHostDepartment.trim() }
      : {}),
    ...(details.requestedHostEmail?.trim()
      ? { requestedHostEmail: details.requestedHostEmail.trim() }
      : {}),
  });

  const trimmedNotes = existingNotes?.trim();
  if (!trimmedNotes) {
    return payload;
  }

  return `${trimmedNotes}\n\n${payload}`;
}

export function appendOtherHostToPurpose(
  purpose: string,
  details: OtherHostDetails,
): string {
  const suffix = formatOtherHostPurposeSuffix(details);
  const base = purpose.trim();
  const combined = base ? `${base} · ${suffix}` : suffix;
  return combined.slice(0, 500);
}

export function formatOtherHostPurposeSuffix(details: OtherHostDetails): string {
  const parts = [`Host: ${details.requestedHostName.trim()}`];
  if (details.requestedHostDepartment?.trim()) {
    parts.push(`Dept: ${details.requestedHostDepartment.trim()}`);
  }
  if (details.requestedHostEmail?.trim()) {
    parts.push(`Email: ${details.requestedHostEmail.trim()}`);
  }
  return parts.join(" · ");
}

export function parseOtherHostFromText(
  text: string | null | undefined,
): OtherHostDetails | null {
  if (!text?.trim()) {
    return null;
  }

  const jsonStart = text.indexOf(OTHER_HOST_JSON_PREFIX);
  if (jsonStart >= 0) {
    const candidate = text.slice(jsonStart).split("\n")[0]?.trim();
    if (candidate) {
      try {
        const parsed = JSON.parse(candidate) as {
          hostSelectionMode?: string;
          requestedHostName?: string;
          requestedHostDepartment?: string;
          requestedHostEmail?: string;
        };
        if (
          parsed.hostSelectionMode === HOST_SELECTION_MODE_OTHER &&
          typeof parsed.requestedHostName === "string" &&
          parsed.requestedHostName.trim()
        ) {
          return {
            mode: HOST_SELECTION_MODE_OTHER,
            requestedHostName: parsed.requestedHostName.trim(),
            requestedHostDepartment: parsed.requestedHostDepartment?.trim() || undefined,
            requestedHostEmail: parsed.requestedHostEmail?.trim() || undefined,
          };
        }
      } catch {
        // fall through to purpose suffix parsing
      }
    }
  }

  const hostMatch = text.match(/Host:\s*([^·\n]+)/i);
  if (!hostMatch?.[1]?.trim()) {
    return null;
  }

  const departmentMatch = text.match(/Dept:\s*([^·\n]+)/i);
  const emailMatch = text.match(/Email:\s*([^·\n]+)/i);

  return {
    mode: HOST_SELECTION_MODE_OTHER,
    requestedHostName: hostMatch[1].trim(),
    requestedHostDepartment: departmentMatch?.[1]?.trim() || undefined,
    requestedHostEmail: emailMatch?.[1]?.trim() || undefined,
  };
}

export function resolveHostForVisitSubmission(params: {
  selection: HostSelection;
  proxyHostMemberId: string;
  purpose?: string;
  visitorNotes?: string;
}): ResolvedHostVisitFields {
  const { selection, proxyHostMemberId, purpose, visitorNotes } = params;

  if (selection.mode === HOST_SELECTION_MODE_MEMBER) {
    return {
      hostMemberId: selection.hostMemberId,
      purpose,
      visitorNotes,
    };
  }

  if (!proxyHostMemberId) {
    throw new Error("A proxy host is required for unknown host visits.");
  }

  return {
    hostMemberId: proxyHostMemberId,
    purpose: purpose ? appendOtherHostToPurpose(purpose, selection) : undefined,
    visitorNotes: encodeOtherHostVisitorNotes(selection, visitorNotes),
  };
}
