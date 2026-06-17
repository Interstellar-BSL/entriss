"use client";

import { RefreshCw } from "lucide-react";

import { kioskCompactButton } from "@/components/kiosk/kiosk-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ApprovalPollStatus({
  showConnectionWarning,
  showRetryNow,
  polling,
  onRetryNow,
}: {
  showConnectionWarning: boolean;
  showRetryNow: boolean;
  polling: boolean;
  onRetryNow: () => void;
}) {
  if (!showConnectionWarning && !showRetryNow) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {showConnectionWarning ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Connection issue. Retrying…
        </p>
      ) : null}

      {showRetryNow ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={cn("w-full sm:w-auto", kioskCompactButton)}
          disabled={polling}
          onClick={onRetryNow}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", polling && "animate-spin")}
            aria-hidden
          />
          Retry Now
        </Button>
      ) : null}
    </div>
  );
}
