export const VISITOR_TAG_VALUES = [
  "VIP",
  "WATCHLIST",
  "REQUIRES_ESCORT",
  "CONTRACTOR",
  "FREQUENT_VISITOR",
] as const;

export type VisitorTag = (typeof VISITOR_TAG_VALUES)[number];

export const VISITOR_TAG_LABELS: Record<VisitorTag, string> = {
  VIP: "VIP",
  WATCHLIST: "Watchlist",
  REQUIRES_ESCORT: "Requires escort",
  CONTRACTOR: "Contractor",
  FREQUENT_VISITOR: "Frequent visitor",
};

export function isVisitorTag(value: string): value is VisitorTag {
  return (VISITOR_TAG_VALUES as readonly string[]).includes(value);
}

export function normalizeVisitorTags(
  tags: string[] | null | undefined,
): VisitorTag[] {
  if (!tags || tags.length === 0) {
    return [];
  }

  const seen = new Set<VisitorTag>();
  const normalized: VisitorTag[] = [];

  for (const tag of tags) {
    if (!isVisitorTag(tag) || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);
  }

  return normalized;
}
