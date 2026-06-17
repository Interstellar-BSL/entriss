"use client";



import { VisitorSelector } from "@/components/visits/visitor-selector";

import { Button } from "@/components/ui/button";

import {

  kioskCompactSupporting,

  kioskCompactTitle,

  kioskPhaseEnter,

} from "@/components/kiosk/kiosk-ui";

import type { VisitorRecord } from "@/lib/api/visitors";

import { cn } from "@/lib/utils/cn";



export function KioskReturningVisitorSearch({

  selected,

  matchedVisitor,

  onCandidateSelect,

  onConfirmUse,

  onClearMatch,

  disabled,

}: {

  selected: VisitorRecord | null;

  matchedVisitor: VisitorRecord | null;

  onCandidateSelect: (visitor: VisitorRecord | null) => void;

  onConfirmUse: () => void;

  onClearMatch: () => void;

  disabled?: boolean;

}) {

  const showConfirmation = Boolean(matchedVisitor && !selected);



  return (

    <section

      className={cn(

        "mb-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4",

        kioskPhaseEnter,

      )}

    >

      <h2 className={kioskCompactTitle}>Have you visited before?</h2>

      <p className={cn("mt-1", kioskCompactSupporting)}>

        Search by name, email, or phone. Confirm your profile before continuing.

      </p>



      <div className="mt-3">

        <VisitorSelector

          selected={selected}

          onSelect={onCandidateSelect}

          disabled={disabled || showConfirmation}

        />

      </div>



      {showConfirmation && matchedVisitor ? (

        <div className="mt-4 rounded-xl border border-emerald-200 bg-[var(--card)] p-4 shadow-sm">

          <p className="text-sm font-semibold text-[var(--foreground)]">Existing visitor found</p>

          <p className="mt-2 text-base font-medium text-[var(--foreground)]">

            {matchedVisitor.firstName} {matchedVisitor.lastName}

          </p>

          {matchedVisitor.email ? (

            <p className="text-sm text-[var(--muted)]">{matchedVisitor.email}</p>

          ) : null}

          {matchedVisitor.phone ? (

            <p className="text-sm text-[var(--muted)]">{matchedVisitor.phone}</p>

          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">

            <Button type="button" onClick={onConfirmUse} disabled={disabled}>

              Use this profile

            </Button>

            <Button

              type="button"

              variant="secondary"

              onClick={onClearMatch}

              disabled={disabled}

            >

              Not me

            </Button>

          </div>

        </div>

      ) : null}

    </section>

  );

}


