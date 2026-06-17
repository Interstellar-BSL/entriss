import { Html5Qrcode } from "html5-qrcode";

export interface KioskCameraDevice {
  id: string;
  label: string;
}

export type CameraInitError =
  | "permission-denied"
  | "no-camera"
  | "not-supported"
  | "unknown";

export class CameraInitFailure extends Error {
  constructor(
    public readonly code: CameraInitError,
    message: string,
  ) {
    super(message);
    this.name = "CameraInitFailure";
  }
}

function isPermissionDenied(error: unknown) {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError" ||
    error.name === "SecurityError"
  );
}

function isNotSupported(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "NotFoundError" || error.name === "DevicesNotFoundError")
  );
}

/**
 * Prefer rear/environment cameras; fall back to the first available device
 * (e.g. laptop front camera).
 */
export function pickPreferredCameraId(
  cameras: KioskCameraDevice[],
): string | null {
  if (cameras.length === 0) {
    return null;
  }

  const rear = cameras.find((camera) =>
    /back|rear|environment|facing back/i.test(camera.label),
  );

  return rear?.id ?? cameras[0]!.id;
}

async function enumerateViaMediaDevices(): Promise<KioskCameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices
    .filter((device) => device.kind === "videoinput" && device.deviceId)
    .map((device) => ({
      id: device.deviceId,
      label: device.label || "Camera",
    }));
}

/**
 * Enumerate cameras, requesting permission when labels are hidden.
 */
export async function listKioskCameras(): Promise<KioskCameraDevice[]> {
  if (typeof window === "undefined") {
    return [];
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraInitFailure(
      "not-supported",
      "Camera access is not supported on this device.",
    );
  }

  let cameras: KioskCameraDevice[] = [];

  try {
    const html5Cameras = await Html5Qrcode.getCameras();
    cameras = html5Cameras.map((camera) => ({
      id: camera.id,
      label: camera.label || "Camera",
    }));
  } catch {
    cameras = [];
  }

  const needsPermission = cameras.length === 0 || cameras.every((c) => !c.label);

  if (needsPermission) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      for (const track of stream.getTracks()) {
        track.stop();
      }
    } catch (error) {
      if (isPermissionDenied(error)) {
        throw new CameraInitFailure(
          "permission-denied",
          "Camera permission was denied. Allow camera access in your browser settings, then try again.",
        );
      }

      if (isNotSupported(error)) {
        throw new CameraInitFailure(
          "no-camera",
          "No camera was found on this device.",
        );
      }

      throw new CameraInitFailure(
        "unknown",
        "Could not access the camera. Please try again or use another check-in option.",
      );
    }

    cameras = await enumerateViaMediaDevices();
  }

  if (cameras.length === 0) {
    throw new CameraInitFailure(
      "no-camera",
      "No camera was found on this device.",
    );
  }

  return cameras;
}
