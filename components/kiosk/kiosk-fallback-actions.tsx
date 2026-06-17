import { Button } from "@/components/ui/button";
import { kioskTouchGhost, kioskTouchPrimary, kioskTouchSecondary } from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

export function KioskFallbackActions({
  primary,
  secondary,
  onHome,
  className,
}: {
  primary?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondary?: { label: string; onClick: () => void };
  onHome: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-lg flex-col gap-3", className)}>
      {primary ? (
        <Button
          type="button"
          className={cn(kioskTouchPrimary, "w-full")}
          onClick={primary.onClick}
        >
          {primary.icon}
          {primary.label}
        </Button>
      ) : null}
      {secondary ? (
        <Button
          type="button"
          variant="secondary"
          className={cn(kioskTouchSecondary, "w-full")}
          onClick={secondary.onClick}
        >
          {secondary.label}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className={cn(kioskTouchSecondary, "w-full text-[var(--muted)]")}
        onClick={onHome}
      >
        Return home
      </Button>
    </div>
  );
}
