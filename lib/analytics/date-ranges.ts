export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "custom";

export interface AnalyticsDateRange {
  from: Date;
  to: Date;
  period: AnalyticsPeriod;
  label: string;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfIsoWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function resolveAnalyticsDateRange(input: {
  period?: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
  now?: Date;
}): AnalyticsDateRange {
  const now = input.now ?? new Date();
  const period = input.period ?? "monthly";

  if (period === "custom" && input.dateFrom && input.dateTo) {
    return {
      period,
      from: startOfDay(new Date(input.dateFrom)),
      to: endOfDay(new Date(input.dateTo)),
      label: "Custom range",
    };
  }

  if (period === "daily") {
    return {
      period,
      from: startOfDay(now),
      to: endOfDay(now),
      label: "Today",
    };
  }

  if (period === "weekly") {
    return {
      period,
      from: startOfIsoWeek(now),
      to: endOfDay(now),
      label: "This week",
    };
  }

  return {
    period: "monthly",
    from: startOfMonth(now),
    to: endOfMonth(now),
    label: "This month",
  };
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function eachDayInRange(from: Date, to: Date) {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);

  while (cursor.getTime() <= end.getTime()) {
    days.push(formatDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
