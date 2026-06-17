"use client";

import { useEffect } from "react";

import { KioskInlineBadge } from "@/components/kiosk/kiosk-inline-badge";
import { Button } from "@/components/ui/button";
import type { ThermalBadgeData } from "@/lib/visits/types";
import type { KioskCapturedDocument } from "@/components/kiosk/kiosk-document-upload";
import { cn } from "@/lib/utils/cn";

type KioskResultLayout = "fullscreen" | "contained";

export type KioskResultProps =
  | {
      variant: "check-in-success";
      visitorName: string;
      hostName: string;
      branchName: string;
      photoUrl?: string | null;
      badge?: ThermalBadgeData | null;
      showBadgePrinting?: boolean;
      layout?: KioskResultLayout;
      onDone?: () => void;
    }
  | {
      variant: "check-out-success";
      visitorName?: string;
      layout?: KioskResultLayout;
      onDone?: () => void;
    }
  | {
      variant: "awaiting-approval";
      visitorName: string;
      photoUrl?: string | null;
      documents?: KioskCapturedDocument[];
      onDone?: () => void;
    }
  | {
      variant: "error";
      message: string;
      layout?: KioskResultLayout;
      onRetry?: () => void;
      onAutoReturn?: () => void;
      autoReturnMs?: number;
    }
  | {
      variant: "policy-blocked";
      title: string;
      message: string;
      layout?: KioskResultLayout;
      onHome: () => void;
      onTryBooking?: () => void;
    };

export function KioskResultScreen(props: KioskResultProps) {
  // Auto-return timer: flows own dismiss timing via scheduleAutoReturn in the
  // parent (kiosk-qr-flow, kiosk-booking-flow, etc.). This built-in effect is
  // only active when a flow passes onAutoReturn — none do today.
  useEffect(() => {
    if (props.variant !== "error" || !props.onAutoReturn) {
      return;
    }

    const delay = props.autoReturnMs ?? 5000;
    const timerId = window.setTimeout(props.onAutoReturn, delay);
    return () => window.clearTimeout(timerId);
  }, [props]);

  if (props.variant === "check-in-success") {
    const contained = props.layout === "contained";

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center text-center",
          contained
            ? "rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 text-emerald-950"
            : "min-h-[calc(100vh-5rem)] justify-center bg-gradient-to-b from-emerald-600 to-emerald-700 px-8 py-14 text-[var(--on-brand)]",
        )}
      >
        <div
          className={cn(
            "mx-auto mb-4 flex items-center justify-center rounded-full text-3xl shadow-lg",
            contained
              ? "h-14 w-14 bg-emerald-100 text-emerald-700"
              : "mb-8 h-24 w-24 bg-[var(--on-brand)]/20 text-5xl",
          )}
        >
          ✓
        </div>
        <h2
          className={cn(
            "font-semibold tracking-tight",
            contained ? "text-xl text-emerald-900" : "text-4xl sm:text-5xl",
          )}
        >
          {props.visitorName}
        </h2>
        <p
          className={cn(
            "mt-2 font-medium",
            contained ? "text-base text-emerald-800" : "mt-4 text-2xl text-emerald-100",
          )}
        >
          Check-in successful
        </p>
        <p className={cn("mt-4", contained ? "text-sm text-emerald-700" : "text-lg text-emerald-50")}>
          Host: {props.hostName}
        </p>
        <p className={cn("mt-1", contained ? "text-sm text-emerald-700" : "text-lg text-emerald-50")}>
          {props.branchName}
        </p>
        {props.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.photoUrl}
            alt=""
            className="mt-8 h-28 w-28 rounded-2xl border-4 border-white/30 object-cover"
          />
        ) : null}
        {props.showBadgePrinting !== false ? (
          <>
            <p
              className={cn(
                "mt-6 font-medium motion-safe:animate-pulse",
                contained ? "text-sm text-emerald-800" : "mt-8 text-xl",
              )}
            >
              Printing badge…
            </p>
            {props.badge ? (
              <div className={cn("mt-4 rounded-lg bg-[var(--card)] p-3", !contained && "mt-8 rounded-2xl p-4")}>
                <KioskInlineBadge badge={props.badge} />
              </div>
            ) : null}
          </>
        ) : null}
        {props.onDone && !contained ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-10 h-14 min-w-[12rem] rounded-2xl text-base"
            onClick={props.onDone}
          >
            Done
          </Button>
        ) : null}
      </div>
    );
  }

  if (props.variant === "check-out-success") {
    const contained = props.layout === "contained";

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center text-center",
          contained
            ? "rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-6 py-8 text-[var(--foreground)]"
            : "min-h-[calc(100vh-5rem)] justify-center bg-[var(--foreground)] px-6 py-12 text-[var(--on-brand)]",
        )}
      >
        <div
          className={cn(
            "mx-auto mb-4 flex items-center justify-center rounded-full text-3xl",
            contained ? "h-14 w-14 bg-[var(--surface-muted)] text-[var(--foreground)]" : "mb-8 h-24 w-24 bg-[var(--on-brand)]/15 text-5xl shadow-lg",
          )}
        >
          ✓
        </div>
        {props.visitorName ? (
          <h2
            className={cn(
              "font-semibold",
              contained ? "text-xl" : "text-3xl sm:text-4xl lg:text-5xl",
            )}
          >
            {props.visitorName}
          </h2>
        ) : null}
        <p
          className={cn(
            "mt-2 font-medium",
            contained ? "text-base text-[var(--foreground)]" : "mt-4 text-xl text-[var(--card)] lg:text-2xl",
          )}
        >
          Check-out complete
        </p>
        <p className={cn("mt-4", contained ? "text-sm text-[var(--muted)]" : "text-base text-[var(--muted)] lg:text-lg")}>
          Thank you for visiting.
        </p>
        {props.onDone && !contained ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-10 h-14 min-w-[12rem] rounded-2xl text-base"
            onClick={props.onDone}
          >
            Done
          </Button>
        ) : null}
      </div>
    );
  }

  if (props.variant === "awaiting-approval") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center bg-amber-500 px-6 py-12 text-center text-[var(--on-brand)]"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--on-brand)]/20 text-4xl">
          ⏳
        </div>
        <h2 className="text-3xl font-semibold">{props.visitorName}</h2>
        <p className="mt-6 max-w-lg text-2xl font-medium leading-snug">
          Your visit request has been submitted
        </p>
        <p className="mt-4 max-w-lg text-lg text-amber-50">
          Please wait for approval from reception or your host
        </p>
        {props.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.photoUrl}
            alt=""
            className="mt-8 h-28 w-28 rounded-2xl border-4 border-white/30 object-cover"
          />
        ) : null}
        {props.documents && props.documents.length > 0 ? (
          <p className="mt-6 text-sm text-amber-100">
            {props.documents.length} identification document
            {props.documents.length === 1 ? "" : "s"} captured locally
          </p>
        ) : null}
        {props.onDone ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-10 h-14 min-w-[12rem] rounded-2xl text-base"
            onClick={props.onDone}
          >
            Return to home
          </Button>
        ) : null}
      </div>
    );
  }

  if (props.variant === "policy-blocked") {
    const contained = props.layout === "contained";

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center text-center",
          contained
            ? "rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-amber-950"
            : "min-h-[calc(100vh-5rem)] justify-center bg-[var(--foreground)] px-6 py-12 text-[var(--on-brand)]",
        )}
      >
        <div
          className={cn(
            "mx-auto mb-4 flex items-center justify-center rounded-full text-3xl",
            contained ? "h-14 w-14 bg-amber-100" : "mb-6 h-20 w-20 bg-[var(--on-brand)]/15 text-4xl",
          )}
        >
          ⏱
        </div>
        <h2 className={cn("font-semibold", contained ? "text-xl" : "text-3xl sm:text-4xl")}>
          {props.title}
        </h2>
        <p className={cn("mt-3 max-w-lg", contained ? "text-sm text-amber-800" : "text-lg text-[var(--card)]")}>
          {props.message}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {props.onTryBooking ? (
            <Button
              type="button"
              variant="secondary"
              className="h-14 min-w-[12rem] rounded-2xl text-base"
              onClick={props.onTryBooking}
            >
              Try booking search
            </Button>
          ) : null}
          <Button
            type="button"
            variant={props.onTryBooking ? "ghost" : "secondary"}
            className={cn(
              "h-14 min-w-[12rem] rounded-2xl text-base",
              props.onTryBooking ? "text-[var(--on-brand)] hover:bg-[var(--on-brand)]/10" : undefined,
            )}
            onClick={props.onHome}
          >
            Return home
          </Button>
        </div>
      </div>
    );
  }

  const contained = props.layout === "contained";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center text-center",
        contained
          ? "rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-red-950"
          : "min-h-[calc(100vh-5rem)] justify-center bg-red-600 px-6 py-12 text-[var(--on-brand)]",
      )}
    >
      <div
        className={cn(
          "mx-auto mb-4 flex items-center justify-center rounded-full text-3xl",
          contained ? "h-14 w-14 bg-red-100 text-red-700" : "mb-6 h-20 w-20 bg-[var(--on-brand)]/20 text-4xl",
        )}
      >
        !
      </div>
      <h2 className={cn("font-semibold", contained ? "text-xl" : "text-3xl")}>
        Something went wrong
      </h2>
      <p className={cn("mt-3 max-w-lg", contained ? "text-sm text-red-800" : "text-lg text-red-100")}>
        {props.message}
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {props.onRetry ? (
          <Button
            type="button"
            variant="secondary"
            className="h-14 min-w-[10rem] text-base"
            onClick={props.onRetry}
          >
            Try again
          </Button>
        ) : null}
        {props.onAutoReturn ? (
          <Button
            type="button"
            variant="ghost"
            className="h-14 text-base text-[var(--on-brand)] hover:bg-[var(--on-brand)]/10"
            onClick={props.onAutoReturn}
          >
            Return home
          </Button>
        ) : null}
      </div>
      {props.onAutoReturn ? (
        <p className="mt-6 text-sm text-red-200">
          Returning to home shortly…
        </p>
      ) : null}
    </div>
  );
}
