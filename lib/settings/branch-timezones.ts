/** Curated IANA timezones for branch configuration (no hardcoded single-region default). */
export const BRANCH_TIMEZONE_OPTIONS = [
  "UTC",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export type BranchTimezoneOption = (typeof BRANCH_TIMEZONE_OPTIONS)[number];

export const DEFAULT_BRANCH_TIMEZONE: BranchTimezoneOption = "UTC";

export function isValidBranchTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeBranchTimezone(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || !isValidBranchTimezone(trimmed)) {
    return DEFAULT_BRANCH_TIMEZONE;
  }
  return trimmed;
}
