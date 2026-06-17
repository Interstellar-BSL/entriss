"use client";

import { useState } from "react";

import { NewVisitForm } from "@/components/visits/new-visit-form";
import { VisitConfirmation } from "@/components/visits/visit-confirmation";
import type { RegisterVisitResponse } from "@/lib/visits/types";

export function NewVisitPage() {
  const [result, setResult] = useState<RegisterVisitResponse | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Schedule visit
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Select an existing visitor or add someone new, then schedule their
          visit
        </p>
      </header>

      {result ? (
        <VisitConfirmation
          result={result}
          onScheduleAnother={() => setResult(null)}
        />
      ) : (
        <NewVisitForm onSuccess={setResult} />
      )}
    </div>
  );
}
