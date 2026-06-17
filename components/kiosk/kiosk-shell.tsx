"use client";

import { useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";

import { KioskBookingFlow } from "@/components/kiosk/kiosk-booking-flow";
import type { KioskBranding } from "@/components/kiosk/kiosk-branding";
import { KioskHome } from "@/components/kiosk/kiosk-home";
import { KioskQrFlow } from "@/components/kiosk/kiosk-qr-flow";
import { KioskRegisterFlow } from "@/components/kiosk/kiosk-register-flow";
import { KioskResultScreen } from "@/components/kiosk/kiosk-result-screen";
import { LoadingState } from "@/components/shared/loading-state";
import { useKioskInactivity } from "@/hooks/use-kiosk-inactivity";
import { useKioskLockdown } from "@/hooks/use-kiosk-lockdown";
import {
  KioskOperationalProvider,
  useKioskOperational,
} from "@/lib/kiosk/kiosk-operational-context";

export type KioskScreen = "home" | "qr" | "booking" | "register";

function KioskShellContent() {
  const { data: session } = useSession();
  const {
    ready: operationalReady,
    kioskEnabled,
    allowWalkIns,
    branding: orgBranding,
    qrCheckInEnabled,
  } = useKioskOperational();
  const [screen, setScreen] = useState<KioskScreen>("home");

  const branding = useMemo<KioskBranding>(
    () => ({
      ...orgBranding,
      organizationName: session?.user?.organizationName ?? null,
    }),
    [orgBranding, session?.user?.organizationName],
  );

  useKioskLockdown();

  const goHome = useCallback(() => {
    setScreen("home");
  }, []);

  const goBooking = useCallback(() => {
    setScreen("booking");
  }, []);

  const goRegister = useCallback(() => {
    setScreen("register");
  }, []);

  useKioskInactivity(goHome, screen !== "home");

  if (!operationalReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <LoadingState label="Loading kiosk…" />
      </div>
    );
  }

  if (!kioskEnabled) {
    return (
      <KioskResultScreen
        variant="policy-blocked"
        title="Self-service check-in is unavailable"
        message="Please proceed to reception."
        onHome={goHome}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {screen === "qr" ? (
        <KioskQrFlow
          qrEnabled={qrCheckInEnabled}
          onBack={goHome}
          onFindBooking={goBooking}
          onRegister={allowWalkIns ? goRegister : undefined}
        />
      ) : screen === "booking" ? (
        <KioskBookingFlow onBack={goHome} onTryBooking={goBooking} />
      ) : screen === "register" ? (
        <KioskRegisterFlow onBack={goHome} onTryBooking={goBooking} />
      ) : (
        <KioskHome
          branding={branding}
          allowWalkIns={allowWalkIns}
          qrEnabled={qrCheckInEnabled}
          onSelect={setScreen}
        />
      )}
    </div>
  );
}

export function KioskShell() {
  return (
    <KioskOperationalProvider>
      <KioskShellContent />
    </KioskOperationalProvider>
  );
}
