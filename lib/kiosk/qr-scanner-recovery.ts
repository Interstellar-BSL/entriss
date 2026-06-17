import type { QrScannerCameraStatus } from "@/components/kiosk/kiosk-qr-scanner";

export function cameraRecoverCopy(status: QrScannerCameraStatus): {
  title: string;
  message: string;
  showRetry: boolean;
} {
  switch (status) {
    case "permission-denied":
      return {
        title: "Camera access required",
        message:
          "Allow camera access to scan your QR code, or use find booking instead.",
        showRetry: true,
      };
    case "no-camera":
      return {
        title: "No camera available",
        message:
          "This device has no usable camera. Try find booking or see reception.",
        showRetry: false,
      };
    case "timeout":
      return {
        title: "Camera took too long to start",
        message: "The scanner timed out. Retry the camera or use find booking.",
        showRetry: true,
      };
    default:
      return {
        title: "Scanner unavailable",
        message: "The camera could not start. Retry or use find booking.",
        showRetry: true,
      };
  }
}
