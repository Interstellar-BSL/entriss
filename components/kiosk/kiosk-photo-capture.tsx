"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  kioskCompactButton,
  kioskTouchPrimary,
} from "@/components/kiosk/kiosk-ui";
import { cn } from "@/lib/utils/cn";

export type KioskCaptureType = "photo" | "document";

type CameraStatus = "idle" | "loading" | "active" | "error";

function streamIsLive(stream: MediaStream | null): boolean {
  return Boolean(
    stream?.getVideoTracks().some(
      (track) => track.readyState === "live" && track.enabled,
    ),
  );
}

function cameraErrorMessage(
  error: unknown,
  required: boolean,
): string {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return required
      ? "Camera permission was denied. Please ask reception for help."
      : "Camera permission was denied. You can continue without a capture.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return required
      ? "No camera was found on this device. Please ask reception for help."
      : "No camera was found. You can continue without a capture.";
  }

  return required
    ? "Camera is required but unavailable. Please ask reception for help."
    : "Camera unavailable. You can continue without a capture.";
}

export function KioskPhotoCapture({
  photoUrl,
  onPhotoChange,
  disabled,
  required = false,
  captureType = "photo",
  compact = false,
  cameraActive = true,
}: {
  photoUrl: string | null;
  onPhotoChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  captureType?: KioskCaptureType;
  compact?: boolean;
  /** When false, webcam is not initialized (identity / pre-capture steps). */
  cameraActive?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [ready, setReady] = useState(false);

  const isDocument = captureType === "document";
  const title = isDocument
    ? `Identification document${required ? " (required)" : ""}`
    : `Visitor photo${required ? " (required)" : ""}`;
  const helperText = isDocument
    ? required
      ? "Hold your ID steady in the frame, then capture"
      : "Place your ID in the frame, then capture"
    : required
      ? "A photo is required before you can continue"
      : "Position your face in the frame, then capture";

  const releaseStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setReady(false);
  }, []);

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) {
      return false;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    try {
      await video.play();
      if (streamIsLive(stream)) {
        setReady(true);
        setCameraStatus("active");
        setCameraError(null);
        return true;
      }
    } catch {
      // Playback can fail while the element is detaching — ignore transient errors.
    }

    return false;
  }, []);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;

      if (node && streamRef.current && !photoUrl && cameraActive && !disabled) {
        void attachStreamToVideo();
      }
    },
    [attachStreamToVideo, cameraActive, disabled, photoUrl],
  );

  const startCamera = useCallback(async () => {
    abortRef.current?.abort();

    const abort = new AbortController();
    abortRef.current = abort;

    setCameraError(null);
    setCameraStatus("loading");
    setReady(false);

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isDocument ? { ideal: "environment" } : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (abort.signal.aborted) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      streamRef.current = stream;

      const attached = await attachStreamToVideo();
      if (!attached && streamIsLive(stream)) {
        setCameraStatus("active");
      }
    } catch (error) {
      if (abort.signal.aborted) {
        return;
      }

      const name = error instanceof DOMException ? error.name : "";
      if (name === "AbortError") {
        return;
      }

      if (streamIsLive(streamRef.current)) {
        setCameraStatus("active");
        return;
      }

      setCameraStatus("error");
      setCameraError(cameraErrorMessage(error, required));
    }
  }, [attachStreamToVideo, isDocument, required]);

  useEffect(() => {
    if (!cameraActive || photoUrl || disabled) {
      releaseStream();
      setCameraStatus("idle");
      setCameraError(null);
      return;
    }

    void startCamera();

    return () => {
      releaseStream();
    };
  }, [cameraActive, photoUrl, disabled, startCamera, releaseStream]);

  function handleVideoPlaying() {
    if (streamIsLive(streamRef.current)) {
      setReady(true);
      setCameraStatus("active");
      setCameraError(null);
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onPhotoChange(dataUrl);
    releaseStream();
    setCameraStatus("idle");
  }

  function retake() {
    onPhotoChange(null);
  }

  const buttonClass = compact ? kioskCompactButton : kioskTouchPrimary;
  const hasLivePreview =
    ready || streamIsLive(streamRef.current) || cameraStatus === "active";
  const showCameraError =
    cameraStatus === "error" && Boolean(cameraError) && !hasLivePreview;

  return (
    <div className="space-y-3">
      <div>
        <p className={cn("font-medium text-[var(--foreground)]", compact ? "text-sm" : "text-lg")}>
          {title}
        </p>
        <p className={cn("mt-1 text-[var(--muted)]", compact ? "text-xs" : "text-sm")}>
          {helperText}
        </p>
        {isDocument && !photoUrl ? (
          <p className="mt-1 text-xs font-medium text-blue-700">
            Hold document steady
          </p>
        ) : null}
      </div>

      {showCameraError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {cameraError}
        </p>
      ) : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--foreground)] shadow-sm",
          compact ? "aspect-[4/3] w-full" : "aspect-[4/3] w-full max-w-lg rounded-[1.5rem]",
        )}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={isDocument ? "Captured document" : "Captured visitor"}
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            ref={setVideoNode}
            playsInline
            muted
            onPlaying={handleVideoPlaying}
            onLoadedMetadata={() => void attachStreamToVideo()}
            className={cn(
              "h-full w-full object-cover",
              !isDocument && "-scale-x-100",
            )}
          />
        )}

        {!photoUrl && isDocument ? (
          <div
            className="pointer-events-none absolute inset-0 bg-[var(--on-brand)]/5"
            aria-hidden
          />
        ) : null}

        {!photoUrl && isDocument ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-full w-full max-w-[85%] rounded-md border-2 border-dashed border-[var(--on-brand)]/70 bg-[var(--on-brand)]/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.08)]" />
          </div>
        ) : null}

        {!photoUrl && cameraStatus === "loading" && !hasLivePreview ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--foreground)]/85">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--muted)]" />
            <p className="mt-3 text-sm text-[var(--card)]">Starting camera…</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {photoUrl ? (
          <Button
            type="button"
            variant="secondary"
            className={cn(compact ? "min-w-[8rem]" : "min-w-[11rem]", buttonClass)}
            disabled={disabled}
            onClick={retake}
          >
            Retake
          </Button>
        ) : (
          <Button
            type="button"
            className={cn(compact ? "min-w-[8rem]" : "min-w-[11rem]", buttonClass)}
            disabled={disabled || !ready}
            onClick={takePhoto}
          >
            {isDocument ? "Capture document" : "Take photo"}
          </Button>
        )}
      </div>
    </div>
  );
}
