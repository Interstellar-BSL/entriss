import { Button } from "@/components/ui/button";
import { kioskStickyFooter } from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

export function KioskStickyFooter({
  onBack,
  onNext,
  backLabel = "Back",
  nextLabel = "Continue",
  nextDisabled,
  nextLoading,
  className,
}: {
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(kioskStickyFooter, className)}
    >
      <div className="mx-auto flex max-w-2xl gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="secondary"
            className="h-14 min-w-[8rem] flex-1 text-base"
            onClick={onBack}
            disabled={nextLoading}
          >
            {backLabel}
          </Button>
        ) : null}
        {onNext ? (
          <Button
            type="button"
            className="h-14 flex-[2] text-base"
            onClick={onNext}
            disabled={nextDisabled || nextLoading}
          >
            {nextLoading ? "Please wait…" : nextLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
