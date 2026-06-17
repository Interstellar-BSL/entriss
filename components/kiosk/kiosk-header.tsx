import { ArrowLeft } from "lucide-react";

import { kioskHeaderBackButton, kioskHeaderBar } from "@/components/kiosk/kiosk-ui";

export function KioskHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <header className={kioskHeaderBar}>
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Return to kiosk home"
          className={kioskHeaderBackButton}
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 truncate text-base text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
