"use client";

import { UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VisitorRecord } from "@/lib/api/visitors";

export function VisitorPhotoPanel({ visitor }: { visitor: VisitorRecord }) {
  const fullName = `${visitor.firstName} ${visitor.lastName}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile photo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
          {visitor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visitor.photoUrl}
              alt={`${fullName} profile photo`}
              className="max-h-[360px] w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                <UserRound className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <p className="text-sm text-[var(--muted)]">No profile photo on file</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
