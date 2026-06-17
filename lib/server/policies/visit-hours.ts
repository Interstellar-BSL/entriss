import type { BranchOperationalSettings } from "@/lib/settings/branch-operational";

function parseHourMinute(
  value: string,
): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function toMinutesSinceMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function currentMinutesSinceMidnight(now: Date, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  return toMinutesSinceMidnight(hour, minute);
}

/**
 * Returns true when `now` falls within the branch visit window.
 * Invalid hour strings fall back to allowing check-in (legacy behavior).
 */
export function isWithinVisitHours(
  operational: Pick<
    BranchOperationalSettings,
    "allowedVisitStartHour" | "allowedVisitEndHour"
  >,
  now = new Date(),
  timeZone?: string,
): boolean {
  const start = parseHourMinute(operational.allowedVisitStartHour);
  const end = parseHourMinute(operational.allowedVisitEndHour);

  if (!start || !end) {
    return true;
  }

  const current = currentMinutesSinceMidnight(now, timeZone);
  const startMin = toMinutesSinceMidnight(start.hours, start.minutes);
  const endMin = toMinutesSinceMidnight(end.hours, end.minutes);

  if (startMin === endMin) {
    return true;
  }

  if (startMin < endMin) {
    return current >= startMin && current < endMin;
  }

  return current >= startMin || current < endMin;
}

export interface VisitHoursEvaluation {
  allowedVisitStartHour: string;
  allowedVisitEndHour: string;
  timeZone?: string;
  nowIso: string;
  currentMinutes: number;
  startMinutes: number;
  endMinutes: number;
  withinHours: boolean;
}

/** Diagnostic helper — same inputs as {@link isWithinVisitHours}, no behavior change. */
export function evaluateVisitHours(
  operational: Pick<
    BranchOperationalSettings,
    "allowedVisitStartHour" | "allowedVisitEndHour"
  >,
  now = new Date(),
  timeZone?: string,
): VisitHoursEvaluation {
  const start = parseHourMinute(operational.allowedVisitStartHour);
  const end = parseHourMinute(operational.allowedVisitEndHour);

  if (!start || !end) {
    return {
      allowedVisitStartHour: operational.allowedVisitStartHour,
      allowedVisitEndHour: operational.allowedVisitEndHour,
      timeZone,
      nowIso: now.toISOString(),
      currentMinutes: currentMinutesSinceMidnight(now, timeZone),
      startMinutes: -1,
      endMinutes: -1,
      withinHours: true,
    };
  }

  const currentMinutes = currentMinutesSinceMidnight(now, timeZone);
  const startMinutes = toMinutesSinceMidnight(start.hours, start.minutes);
  const endMinutes = toMinutesSinceMidnight(end.hours, end.minutes);

  let withinHours: boolean;
  if (startMinutes === endMinutes) {
    withinHours = true;
  } else if (startMinutes < endMinutes) {
    withinHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    withinHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return {
    allowedVisitStartHour: operational.allowedVisitStartHour,
    allowedVisitEndHour: operational.allowedVisitEndHour,
    timeZone,
    nowIso: now.toISOString(),
    currentMinutes,
    startMinutes,
    endMinutes,
    withinHours,
  };
}
