"use client";

import { useEffect, useState } from "react";

import { ActivityViewer } from "@/components/activity/activity-viewer";
import { Drawer } from "@/components/ui/drawer";
import { Visitor360Overview } from "@/components/visitors/visitor-360-overview";
import { VisitorDocumentsPanel } from "@/components/visitors/visitor-documents-panel";
import { VisitorIdentityPanel } from "@/components/visitors/visitor-identity-panel";
import { VisitorInsightsPanel } from "@/components/visitors/visitor-insights-panel";
import { VisitorNotesPanel } from "@/components/visitors/visitor-notes-panel";
import { VisitorPhotoPanel } from "@/components/visitors/visitor-photo-panel";
import { VisitorTagsPanel } from "@/components/visitors/visitor-tags-panel";
import { VisitorTimelinePanel } from "@/components/visitors/visitor-timeline-panel";
import { listVisits } from "@/lib/api/visits";
import {
  getVisitorInsights,
  getVisitorTags,
  type VisitorInsightsData,
  type VisitorRecord,
} from "@/lib/api/visitors";
import type { VisitorTag } from "@/lib/visitors/tags";
import { cn } from "@/lib/utils/cn";

type Visitor360Tab =
  | "overview"
  | "identity"
  | "timeline"
  | "activity"
  | "insights"
  | "notes";

const TABS: Array<{ id: Visitor360Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "identity", label: "Identity" },
  { id: "timeline", label: "Timeline" },
  { id: "activity", label: "Activity" },
  { id: "insights", label: "Insights" },
  { id: "notes", label: "Notes" },
];

export function VisitorProfileDrawer({
  visitor,
  open,
  onClose,
}: {
  visitor: VisitorRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Visitor360Tab>("overview");
  const [tags, setTags] = useState<VisitorTag[]>([]);
  const [insights, setInsights] = useState<VisitorInsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    if (!visitor || !open) {
      return;
    }

    const visitorId = visitor.id;
    setTab("overview");
    let cancelled = false;

    async function loadOverviewData() {
      setInsightsLoading(true);
      setInsights(null);
      setTags([]);
      setIsCheckedIn(false);

      const [tagsResult, insightsResult, activeVisitsResult] =
        await Promise.allSettled([
          getVisitorTags(visitorId),
          getVisitorInsights(visitorId),
          listVisits({
            visitorId,
            status: "CHECKED_IN",
            limit: 1,
          }),
        ]);

      if (cancelled) {
        return;
      }

      if (tagsResult.status === "fulfilled") {
        setTags(tagsResult.value.tags);
      }

      if (insightsResult.status === "fulfilled") {
        setInsights(insightsResult.value.insights);
      }

      if (activeVisitsResult.status === "fulfilled") {
        setIsCheckedIn(activeVisitsResult.value.pagination.total > 0);
      }

      setInsightsLoading(false);
    }

    void loadOverviewData();

    return () => {
      cancelled = true;
    };
  }, [open, visitor]);

  if (!visitor) {
    return null;
  }

  const fullName = `${visitor.firstName} ${visitor.lastName}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={fullName}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <nav
          className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-3"
          aria-label="Visitor 360 sections"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === entry.id
                  ? "bg-[var(--brand-primary)] text-[var(--on-brand)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
              )}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        {tab === "overview" ? (
          <Visitor360Overview
            visitor={visitor}
            tags={tags}
            insights={insights}
            insightsLoading={insightsLoading}
            isCheckedIn={isCheckedIn}
          />
        ) : null}

        {tab === "identity" ? (
          <div className="space-y-4">
            <VisitorIdentityPanel visitor={visitor} />
            <VisitorPhotoPanel visitor={visitor} />
            <VisitorDocumentsPanel visitorId={visitor.id} />
          </div>
        ) : null}

        {tab === "timeline" ? (
          <VisitorTimelinePanel visitorId={visitor.id} />
        ) : null}

        {tab === "activity" ? (
          <ActivityViewer
            filters={{ visitorId: visitor.id }}
            emptyMessage="No activity recorded for this visitor yet."
          />
        ) : null}

        {tab === "insights" ? (
          <VisitorInsightsPanel
            visitorId={visitor.id}
            tags={tags}
            initialInsights={insights}
          />
        ) : null}

        {tab === "notes" ? (
          <div className="space-y-4">
            <VisitorTagsPanel
              visitorId={visitor.id}
              onTagsChange={setTags}
            />
            <VisitorNotesPanel visitorId={visitor.id} />
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
