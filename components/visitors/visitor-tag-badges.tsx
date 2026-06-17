"use client";

import { cn } from "@/lib/utils/cn";
import {
  VISITOR_TAG_LABELS,
  type VisitorTag,
} from "@/lib/visitors/tags";

const TAG_STYLES: Record<VisitorTag, string> = {
  VIP: "bg-amber-100 text-amber-900 ring-amber-200",
  WATCHLIST: "bg-red-50 text-red-700 ring-red-200",
  REQUIRES_ESCORT: "bg-orange-50 text-orange-800 ring-orange-100",
  CONTRACTOR: "bg-sky-50 text-sky-700 ring-sky-100",
  FREQUENT_VISITOR: "bg-violet-50 text-violet-700 ring-violet-100",
};

export function VisitorTagBadge({ tag }: { tag: VisitorTag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TAG_STYLES[tag],
      )}
    >
      {VISITOR_TAG_LABELS[tag]}
    </span>
  );
}

export function VisitorTagBadges({
  tags,
  className,
}: {
  tags: VisitorTag[];
  className?: string;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <VisitorTagBadge key={tag} tag={tag} />
      ))}
    </div>
  );
}
