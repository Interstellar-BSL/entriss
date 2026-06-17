import { KioskHeader } from "@/components/kiosk/kiosk-header";
import {
  kioskFlowMain,
  kioskFlowNarrow,
  kioskFlowPageGradient,
  kioskFlowWide,
} from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

export function KioskFlowFrame({
  title,
  subtitle,
  onBack,
  children,
  wide = false,
  footer,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col", kioskFlowPageGradient)}>
      <KioskHeader title={title} subtitle={subtitle} onBack={onBack} />
      <main
        id="kiosk-main"
        role="main"
        className={cn(kioskFlowMain, wide ? kioskFlowWide : kioskFlowNarrow)}
      >
        {children}
      </main>
      {footer}
    </div>
  );
}
