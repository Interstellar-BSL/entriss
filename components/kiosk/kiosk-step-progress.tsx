import { cn } from "@/lib/utils/cn";

const STEP_LABELS = [
  "Your details",
  "Visit details",
  "Photo & ID",
  "Review",
] as const;

export function KioskStepProgress({
  currentStep,
  totalSteps = 4,
}: {
  currentStep: number;
  totalSteps?: number;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const complete = step < currentStep;

          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  complete && "bg-[var(--brand-primary)] text-[var(--on-brand)]",
                  active && "bg-[var(--brand-primary)] text-[var(--on-brand)] ring-4 ring-[var(--border)]",
                  !complete && !active && "bg-[var(--surface-muted)] text-[var(--muted)]",
                )}
                aria-current={active ? "step" : undefined}
              >
                {complete ? "✓" : step}
              </div>
              <span
                className={cn(
                  "hidden text-center text-xs font-medium sm:block",
                  active ? "text-[var(--foreground)]" : "text-[var(--muted)]",
                )}
              >
                {STEP_LABELS[index]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-[var(--muted)] sm:hidden">
        Step {currentStep} of {totalSteps}: {STEP_LABELS[currentStep - 1]}
      </p>
    </div>
  );
}
