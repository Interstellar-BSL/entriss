"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { VisitorRow } from "@/components/visitors/visitors-table";

export interface VisitorActionHandlers {
  onView: (visitor: VisitorRow) => void;
}

export function VisitorRowActions({
  visitor,
  handlers,
}: {
  visitor: VisitorRow;
  handlers: VisitorActionHandlers;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => handlers.onView(visitor)}
      >
        View
      </Button>

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
            handlers.onView(visitor);
          }}
        />
        <DropdownMenuItem
          label="Schedule visit"
          href="/visits/new"
          onClick={() => setOpen(false)}
        />
      </DropdownMenu>
    </div>
  );
}
