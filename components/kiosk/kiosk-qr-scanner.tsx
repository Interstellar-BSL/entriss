"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

import { KioskResolvingHint } from "@/components/kiosk/kiosk-resolving-hint";
import { Button } from "@/components/ui/button";
import { kioskCompactButton } from "@/components/kiosk/kiosk-ui";
import {
  CameraInitFailure,
  listKioskCameras,
  pickPreferredCameraId,
} from "@/lib/kiosk/camera";
import { appendKioskQrDebugEvent } from "@/lib/kiosk/kiosk-qr-debug-log";
import {
  buildKioskQrCameraScanConfig,
  computeDecodeVarianceIndex,
  isQrDebugMode,
  isVideoMeasurable,
  normalizeQrToken,
  QrDecoderEngine,
  qrScanHintMessage,
  type QrDecoderDebugState,
  type QrScanHint,
} from "@/lib/kiosk/qr-decoder-engine";
import { cn } from "@/lib/utils/cn";

const SCANNER_ELEMENT_ID = "kiosk-qr-reader";
const MOUNT_STABILIZE_MS = 50;

export type QrScannerCameraStatus =
  | "loading"
  | "ready"
  | "permission-denied"
  | "no-camera"
  | "failed"
  | "timeout";

const SCANNER_LOAD_TIMEOUT_MS = 15_000;

function isContainerMeasurable(element: HTMLElement | null): boolean {
  if (!element?.isConnected) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function QrDebugOverlay({ state }: { state: QrDecoderDebugState }) {
  if (!isQrDebugMode()) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-30 max-w-[min(100%,18rem)] rounded-md bg-black/80 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-emerald-300">
      <p className="font-semibold text-emerald-200">QR DEBUG MODE</p>
      <p>FPS: {state.cameraFps}</p>
      <p>Capture rate: {state.frameCaptureRate}/s</p>
      <p>Decode attempts: {state.decodeAttempts}</p>
      <p>Successful decodes: {state.successfulDecodes}</p>
      <p>Rejections: {state.frameRejections}</p>
      <p>Confidence: {(state.lastConfidence * 100).toFixed(0)}%</p>
      <p>Stability: {state.decodeStability}</p>
      <p>Variance: {state.decodeVarianceIndex.toFixed(2)}</p>
      <p>Confirm: {(state.confirmationProgress * 100).toFixed(0)}%</p>
      <p>Mode: {state.confirmMode}</p>
      <p>Buffer: {state.bufferFill}</p>
      <p>Light: {state.lightingHint}</p>
      <p>
        Glare / contrast:{" "}
        {state.glareScore === null ? "—" : state.glareScore.toFixed(2)} /{" "}
        {state.contrastScore === null ? "—" : state.contrastScore.toFixed(2)}
      </p>
      <p>
        Resolution:{" "}
        {state.resolution
          ? `${state.resolution.width}×${state.resolution.height}`
          : "—"}
      </p>
      <p>Region: {state.lastRegion ?? "—"}</p>
      <p className="truncate">Token: {state.leadingTokenPreview ?? "—"}</p>
      {state.recentTokenPreviews.length > 0 ? (
        <p className="truncate">
          Recent: {state.recentTokenPreviews.join(" | ")}
        </p>
      ) : null}
    </div>
  );
}

function deriveStabilityHint(
  scanHint: QrScanHint,
  debugState: QrDecoderDebugState | null,
  frameVarianceIndex: number,
): string | null {
  if (scanHint === "reduce-glare") {
    return "Reduce glare on screen";
  }

  if (scanHint === "hold-for-scan") {
    return "Hold steady for better scan";
  }

  if (frameVarianceIndex >= 0.6 && (debugState?.lastConfidence ?? 0) < 0.5) {
    return "Hold steady for better scan";
  }

  if (debugState?.glareDetected) {
    return "Reduce glare on screen";
  }

  if (
    (debugState?.decodeVarianceIndex ?? 0) >= 0.5 &&
    (debugState?.lastConfidence ?? 0) < 0.5 &&
    (debugState?.successfulDecodes ?? 0) >= 2
  ) {
    return "Hold steady for better scan";
  }

  return null;
}

function logCameraStreamMetrics(video: HTMLVideoElement) {
  const stream = video.srcObject;
  if (!(stream instanceof MediaStream)) {
    return;
  }

  const [track] = stream.getVideoTracks();
  if (!track) {
    return;
  }

  const settings = track.getSettings();
  const capabilities = track.getCapabilities?.() ?? {};

  appendKioskQrDebugEvent("QR SCANNER", "camera metrics", {
    exposure: "exposureMode" in settings ? settings.exposureMode : null,
    brightness:
      "brightness" in settings
        ? (settings as MediaTrackSettings & { brightness?: number }).brightness
        : null,
    resolution: {
      width: settings.width ?? video.videoWidth,
      height: settings.height ?? video.videoHeight,
    },
    fps: settings.frameRate ?? null,
    facingMode: settings.facingMode ?? null,
    capabilities,
  });
}

export function KioskQrScanner({
  active,
  scannerKey,
  resolving,
  onScan,
  onCameraStatus,
  onRestart,
  onDecoderInstrumentation,
}: {
  active: boolean;
  scannerKey: number;
  resolving: boolean;
  onScan: (token: string) => void;
  onCameraStatus: (status: QrScannerCameraStatus) => void;
  onRestart: () => void;
  onDecoderInstrumentation?: (state: QrDecoderDebugState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const engineRef = useRef<QrDecoderEngine | null>(null);
  const onScanRef = useRef(onScan);
  const onDecoderInstrumentationRef = useRef(onDecoderInstrumentation);
  const frameLogCounterRef = useRef(0);
  const recentFrameTokensRef = useRef<string[]>([]);
  const [localStatus, setLocalStatus] = useState<QrScannerCameraStatus>("loading");
  const [mountReady, setMountReady] = useState(false);
  const [scanHint, setScanHint] = useState<QrScanHint>("scanning");
  const [hintMessage, setHintMessage] = useState(qrScanHintMessage("scanning"));
  const [frameVarianceIndex, setFrameVarianceIndex] = useState(0);
  const [debugState, setDebugState] = useState<QrDecoderDebugState | null>(null);
  const debugEnabled = isQrDebugMode();

  onScanRef.current = onScan;
  onDecoderInstrumentationRef.current = onDecoderInstrumentation;

  const trackFrameDecode = useCallback((rawToken: string) => {
    const normalized = normalizeQrToken(rawToken);
    if (!normalized) {
      return;
    }

    const recent = recentFrameTokensRef.current;
    recent.push(normalized);
    if (recent.length > 5) {
      recent.shift();
    }

    setFrameVarianceIndex(computeDecodeVarianceIndex(recent));
  }, []);

  const updateStatus = useCallback(
    (status: QrScannerCameraStatus) => {
      setLocalStatus(status);
      onCameraStatus(status);
    },
    [onCameraStatus],
  );

  useEffect(() => {
    if (!active) {
      setMountReady(false);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let stabilizeTimer: number | null = null;

    const markReadyWhenMeasurable = () => {
      if (cancelled) {
        return;
      }

      if (isContainerMeasurable(containerRef.current)) {
        setMountReady(true);
        return;
      }

      stabilizeTimer = window.setTimeout(() => {
        if (!cancelled && isContainerMeasurable(containerRef.current)) {
          setMountReady(true);
        }
      }, MOUNT_STABILIZE_MS);
    };

    rafId = window.requestAnimationFrame(markReadyWhenMeasurable);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (stabilizeTimer !== null) {
        window.clearTimeout(stabilizeTimer);
      }
      setMountReady(false);
    };
  }, [active, scannerKey]);

  useEffect(() => {
    if (!active || !mountReady) {
      if (!active) {
        updateStatus("loading");
      }
      return;
    }

    const mountElement = containerRef.current;
    if (!isContainerMeasurable(mountElement)) {
      return;
    }

    let cancelled = false;
    let loadTimer: number | null = null;
    const elementId = `${SCANNER_ELEMENT_ID}-${scannerKey}`;

    if (!document.getElementById(elementId)) {
      return;
    }

    const scanner = new Html5Qrcode(elementId, {
      verbose: debugEnabled,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
    });
    scannerRef.current = scanner;

    const engine = new QrDecoderEngine({
      onConfirmed: (token) => {
        appendKioskQrDebugEvent("QR SCANNER", "qr detected", {
          tokenPreview: `${token.slice(0, 24)}${token.length > 24 ? "…" : ""}`,
          tokenLength: token.length,
        });
        onScanRef.current(token);
      },
      onHint: (hint, message) => {
        setScanHint(hint);
        setHintMessage(message);
      },
      onDebugUpdate: (state) => {
        if (!debugEnabled) {
          return;
        }

        setDebugState(state);
        onDecoderInstrumentationRef.current?.(state);
      },
    });
    engineRef.current = engine;

    async function start() {
      if (cancelled || !isContainerMeasurable(containerRef.current)) {
        return;
      }

      appendKioskQrDebugEvent("QR SCANNER", "camera start", {
        scannerKey,
        elementId,
      });

      updateStatus("loading");

      loadTimer = window.setTimeout(() => {
        if (!cancelled && scannerRef.current?.isScanning !== true) {
          void scanner.stop().catch(() => undefined);
          updateStatus("timeout");
        }
      }, SCANNER_LOAD_TIMEOUT_MS);

      try {
        const cameras = await listKioskCameras();
        if (cancelled || !isContainerMeasurable(containerRef.current)) {
          return;
        }

        const cameraId = pickPreferredCameraId(cameras);
        if (!cameraId) {
          updateStatus("no-camera");
          return;
        }

        if (!document.getElementById(elementId)) {
          return;
        }

        await scanner.start(
          cameraId,
          buildKioskQrCameraScanConfig(),
          (text) => {
            frameLogCounterRef.current += 1;
            trackFrameDecode(text);
            if (
              debugEnabled &&
              frameLogCounterRef.current % 30 === 0
            ) {
              appendKioskQrDebugEvent("QR SCANNER", "frame captured", {
                frameCount: frameLogCounterRef.current,
                decodePreview: `${text.slice(0, 16)}${text.length > 16 ? "…" : ""}`,
                frameVarianceIndex: computeDecodeVarianceIndex(
                  recentFrameTokensRef.current,
                ),
              });
            }
            engine.ingestDecodeAttempt(text, "html5-primary");
          },
          () => {
            engine.recordDecodeMiss("html5-primary");
          },
        );

        if (cancelled || !isContainerMeasurable(containerRef.current)) {
          if (scanner.isScanning) {
            await scanner.stop().catch(() => undefined);
          }
          return;
        }

        if (loadTimer !== null) {
          window.clearTimeout(loadTimer);
        }
        updateStatus("ready");

        const video = containerRef.current?.querySelector("video");
        if (video instanceof HTMLVideoElement && isVideoMeasurable(video)) {
          if (debugEnabled) {
            logCameraStreamMetrics(video);
          }
          engine.startSupplementalDecodeLoop(video, () => {
            return (
              !cancelled &&
              isContainerMeasurable(containerRef.current) &&
              video.isConnected &&
              scannerRef.current?.isScanning === true
            );
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (loadTimer !== null) {
          window.clearTimeout(loadTimer);
        }

        if (error instanceof CameraInitFailure) {
          updateStatus(
            error.code === "permission-denied"
              ? "permission-denied"
              : error.code === "no-camera"
                ? "no-camera"
                : "failed",
          );
          return;
        }

        updateStatus("failed");
      }
    }

    const bootTimer = window.setTimeout(() => {
      void start();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      if (loadTimer !== null) {
        window.clearTimeout(loadTimer);
      }
      engine.dispose();
      engineRef.current = null;

      void (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          scanner.clear();
        } catch {
          // Scanner may already be torn down with the DOM.
        } finally {
          scannerRef.current = null;
        }
      })();
    };
  }, [active, mountReady, scannerKey, updateStatus, debugEnabled, trackFrameDecode]);

  if (!active) {
    return null;
  }

  const overlayMessage =
    localStatus === "ready" && !resolving ? hintMessage : "Starting camera…";

  const stabilityHint = deriveStabilityHint(
    scanHint,
    debugState,
    frameVarianceIndex,
  );

  const showBootOverlay = !mountReady || localStatus === "loading";

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--foreground)] shadow-sm",
          "aspect-[4/3] w-full max-h-[28rem]",
        )}
      >
        <div
          ref={containerRef}
          id={`${SCANNER_ELEMENT_ID}-${scannerKey}`}
          className={cn(
            "absolute inset-0",
            "[&_video]:h-full [&_video]:w-full [&_video]:object-cover",
          )}
        />

        {showBootOverlay ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--foreground)]/90">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--muted)]" />
            <p className="mt-3 text-sm text-[var(--card)]">
              {!mountReady ? "Preparing scanner…" : overlayMessage}
            </p>
          </div>
        ) : null}

        {mountReady && localStatus === "ready" && !resolving ? (
          <>
            <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-white/25 motion-safe:animate-pulse" />
            <div
              className="pointer-events-none absolute inset-x-4 h-0.5 bg-emerald-400/70 motion-safe:animate-[kiosk-qr-scan_2.4s_ease-in-out_infinite]"
              style={{ top: "28%" }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 py-4 text-center">
              <p className="text-sm font-medium text-[var(--on-brand)] sm:text-base">
                {overlayMessage}
              </p>
              {stabilityHint && stabilityHint !== overlayMessage ? (
                <p className="mt-1 text-xs text-amber-100/95">{stabilityHint}</p>
              ) : null}
              {scanHint === "retrying" ? (
                <p className="mt-1 text-xs text-[var(--card)]">
                  Keep the code in frame — we will keep trying
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {debugEnabled && debugState ? (
          <QrDebugOverlay state={debugState} />
        ) : null}

        {resolving ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--foreground)]/75">
            <KioskResolvingHint />
          </div>
        ) : null}
      </div>

      {localStatus === "ready" ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            className={kioskCompactButton}
            onClick={onRestart}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Restart camera
          </Button>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes kiosk-qr-scan {
          0%,
          100% {
            top: 22%;
            opacity: 0.35;
          }
          50% {
            top: 62%;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
