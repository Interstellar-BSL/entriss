"use client";

import { memo } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  canCheckInVisit,
  canCheckOutVisit,
  canGenerateVisitQr,
  canPrintVisitBadge,
} from "@/lib/visits/actions";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";

export interface VisitActionHandlers {
  onView: (visit: VisitWithRelations) => void;
  onCheckIn: (visit: VisitWithRelations) => void;
  onCheckOut: (visit: VisitWithRelations) => void;
  onGenerateQr: (visit: VisitWithRelations) => void;
  onPrintBadge: (visit: VisitWithRelations) => void;
}

export const VisitRowActions = memo(function VisitRowActions({
  visit,
  handlers,
  busyAction,
}: {
  visit: VisitWithRelations;
  handlers: VisitActionHandlers;
  busyAction?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isBusy = busyAction === visit.id;

  const showCheckIn = canCheckInVisit(visit.status);
  const showCheckOut = canCheckOutVisit(visit.status);

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {showCheckIn ? (
        <Button
          type="button"
          size="sm"
          loading={isBusy}
          disabled={isBusy}
          onClick={() => handlers.onCheckIn(visit)}
        >
          {isBusy ? "Checking in…" : "Check in"}
        </Button>
      ) : showCheckOut ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={isBusy}
          disabled={isBusy}
          onClick={() => handlers.onCheckOut(visit)}
        >
          {isBusy ? "Checking out…" : "Check out"}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => handlers.onView(visit)}
        >
          View
        </Button>
      )}

      <DropdownMenu
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={open}
            aria-haspopup="menu"
            disabled={isBusy}
            onClick={() => setOpen((value) => !value)}
            className="px-2"
          >
            ⋯
          </Button>
        }
      >
        <DropdownMenuItem
          label="View details"
          onClick={() => {
            setOpen(false);
            handlers.onView(visit);
          }}
        />
        {showCheckIn ? (
          <DropdownMenuItem
            label="Check in"
            onClick={() => {
              setOpen(false);
              handlers.onCheckIn(visit);
            }}
          />
        ) : null}
        {showCheckOut ? (
          <DropdownMenuItem
            label="Check out"
            onClick={() => {
              setOpen(false);
              handlers.onCheckOut(visit);
            }}
          />
        ) : null}
        {canGenerateVisitQr(visit.status) ? (
          <DropdownMenuItem
            label={visit.qrToken ? "Regenerate QR" : "Generate QR"}
            onClick={() => {
              setOpen(false);
              handlers.onGenerateQr(visit);
            }}
          />
        ) : null}
        {canPrintVisitBadge(visit.status) ? (
          <DropdownMenuItem
            label="Print badge"
            onClick={() => {
              setOpen(false);
              handlers.onPrintBadge(visit);
            }}
          />
        ) : null}
      </DropdownMenu>
    </div>
  );
});
