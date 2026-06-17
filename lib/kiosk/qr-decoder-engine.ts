import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type Html5QrcodeCameraScanConfig,
} from "html5-qrcode";

import { appendKioskQrDebugEvent } from "@/lib/kiosk/kiosk-qr-debug-log";

/** Dev overlay — set NEXT_PUBLIC_KIOSK_QR_DEBUG=true */
export function isQrDebugMode(): boolean {
  return process.env.NEXT_PUBLIC_KIOSK_QR_DEBUG === "true";
}

export type QrScanHint =
  | "scanning"
  | "hold-steady"
  | "move-closer"
  | "retrying"
  | "hold-for-scan"
  | "reduce-glare";

export type QrLightingHint = "GOOD" | "LOW" | "UNCLEAR";

export type QrDecodeStability = "HIGH" | "MEDIUM" | "LOW";

export type QrConfirmMode = "strict" | "balanced";

export type QrDecoderDebugState = {
  cameraFps: number;
  frameCaptureRate: number;
  decodeAttempts: number;
  successfulDecodes: number;
  lastConfidence: number;
  dominantTokenConfidence: number;
  resolution: { width: number; height: number } | null;
  bufferFill: number;
  leadingTokenPreview: string | null;
  recentTokenPreviews: string[];
  lastRegion: string | null;
  frameRejections: number;
  failedDecodeRatio: number;
  leadingMatchCount: number;
  confirmationProgress: number;
  confirmed: boolean;
  lightingHint: QrLightingHint;
  brightnessLevel: number | null;
  contrastEstimate: number | null;
  frameSharpness: number | null;
  glareDetected: boolean | null;
  lowLight: boolean | null;
  glareScore: number | null;
  contrastScore: number | null;
  decodeVarianceIndex: number;
  decodeStability: QrDecodeStability;
  confirmMode: QrConfirmMode;
};

export type QrFrameLightingEstimate = {
  brightnessLevel: number;
  contrastEstimate: number;
  frameSharpness: number;
  glareDetected: boolean;
  lowLight: boolean;
};

const LOW_LIGHT_BRIGHTNESS_THRESHOLD = 72;
const LOW_CONTRAST_THRESHOLD = 28;
const HIGH_GLARE_BRIGHTNESS_THRESHOLD = 215;

/** Infer lighting quality from decoder proxy signals (no decode logic change). */
export function inferLightingHintFromDecoder(
  state: Pick<
    QrDecoderDebugState,
    "lastConfidence" | "failedDecodeRatio" | "decodeAttempts" | "lightingHint"
  >,
  frameLighting?: QrFrameLightingEstimate | null,
): QrLightingHint {
  if (frameLighting?.lowLight || frameLighting?.glareDetected) {
    return frameLighting.lowLight ? "LOW" : "UNCLEAR";
  }

  if (state.lastConfidence >= 0.35) {
    return "GOOD";
  }

  if (
    state.decodeAttempts > 15 &&
    state.failedDecodeRatio > 0.85
  ) {
    return "LOW";
  }

  if (state.lastConfidence > 0) {
    return "UNCLEAR";
  }

  return state.lightingHint;
}

/** Sample frame luminance/contrast for debug logging only. */
export function estimateCanvasLighting(
  canvas: HTMLCanvasElement,
): QrFrameLightingEstimate | null {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }

  const sampleWidth = Math.min(canvas.width, 160);
  const sampleHeight = Math.min(canvas.height, 120);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const { data } = imageData;

  let luminanceSum = 0;
  let luminanceSqSum = 0;
  let brightPixelCount = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminanceSum += luminance;
    luminanceSqSum += luminance * luminance;
    if (luminance >= HIGH_GLARE_BRIGHTNESS_THRESHOLD) {
      brightPixelCount += 1;
    }
  }

  const brightnessLevel = luminanceSum / pixelCount;
  const variance = Math.max(
    0,
    luminanceSqSum / pixelCount - brightnessLevel * brightnessLevel,
  );
  const contrastEstimate = Math.sqrt(variance);
  const frameSharpness = contrastEstimate;
  const glareDetected = brightPixelCount / pixelCount > 0.12;
  const lowLight =
    brightnessLevel < LOW_LIGHT_BRIGHTNESS_THRESHOLD ||
    contrastEstimate < LOW_CONTRAST_THRESHOLD;

  return {
    brightnessLevel: Math.round(brightnessLevel),
    contrastEstimate: Math.round(contrastEstimate),
    frameSharpness: Math.round(frameSharpness),
    glareDetected,
    lowLight,
  };
}

export type QrScanRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type FramePreprocessVariant = "normal" | "contrast" | "bright";

const DEFAULT_BUFFER_SIZE = 8;
const DEFAULT_MIN_CONSISTENT_MATCHES = 3;
const INSTANT_CONFIRM_MATCH_COUNT = 3;
const MIN_WEIGHTED_CONFIRM_COUNT = 2;
const STABILITY_SCORE_THRESHOLD = 0.78;
const DEFAULT_RETRY_HINT_INTERVAL_MS = 750;
const HIGH_VARIANCE_HINT_INTERVAL_MS = 420;
const HINT_MESSAGES: Record<QrScanHint, string> = {
  scanning: "Align QR code within frame",
  "hold-steady": "Hold QR steady",
  "move-closer": "Move closer or improve lighting",
  retrying: "Retrying scan automatically",
  "hold-for-scan": "Hold steady for better scan",
  "reduce-glare": "Reduce glare on screen",
};

const INVISIBLE_UNICODE_PATTERN =
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2060\u180E]/g;

/** Normalize decoded QR text before buffer comparison. */
export function normalizeQrToken(token: string): string {
  let normalized = token.replace(INVISIBLE_UNICODE_PATTERN, "").trim();
  if (!normalized) {
    return "";
  }

  if (/^[A-Za-z0-9+/_=-]+$/.test(normalized)) {
    normalized = normalized.replace(/=+$/, "");
  }

  return normalized;
}

export function getQrConfirmMode(): QrConfirmMode {
  return process.env.NEXT_PUBLIC_KIOSK_QR_CONFIRM_MODE === "balanced"
    ? "balanced"
    : "strict";
}

export function computeDecodeVarianceIndex(tokens: Array<string | null>): number {
  const decoded = tokens.filter((entry): entry is string => Boolean(entry));
  if (decoded.length <= 1) {
    return 0;
  }

  const uniqueCount = new Set(decoded).size;
  return uniqueCount / decoded.length;
}

export function inferDecodeStability(
  state: Pick<
    QrDecoderDebugState,
    "lastConfidence" | "decodeVarianceIndex" | "leadingMatchCount"
  >,
): QrDecodeStability {
  if (state.lastConfidence >= 0.5 && state.decodeVarianceIndex < 0.45) {
    return "HIGH";
  }

  if (state.lastConfidence >= 0.25 || state.leadingMatchCount >= 2) {
    return "MEDIUM";
  }

  return "LOW";
}

/** Classify decode variance index for stability weighting (LOW = stable decodes). */
export type DecodeVarianceClass = "LOW" | "MEDIUM" | "HIGH";

export function classifyDecodeVariance(
  decodeVarianceIndex: number,
): DecodeVarianceClass {
  if (decodeVarianceIndex < 0.4) {
    return "LOW";
  }

  if (decodeVarianceIndex < 0.65) {
    return "MEDIUM";
  }

  return "HIGH";
}

export function computeGlareScore(
  lighting: QrFrameLightingEstimate | null,
): number | null {
  if (!lighting) {
    return null;
  }

  return lighting.glareDetected
    ? Math.min(1, lighting.brightnessLevel / 255)
    : 0;
}

export type TokenStabilityScore = {
  token: string;
  count: number;
  score: number;
  matchFrequencyWeight: number;
  decodeStabilityWeight: number;
  lightingQualityWeight: number;
  varianceClass: DecodeVarianceClass;
  glareScore: number | null;
};

function computeDecodeStabilityWeight(
  varianceClass: DecodeVarianceClass,
): number {
  switch (varianceClass) {
    case "LOW":
      return 0.4;
    case "MEDIUM":
      return 0.2;
    default:
      return 0;
  }
}

function computeLightingQualityWeight(glareScore: number | null): number {
  if (glareScore === null) {
    return 0.15;
  }

  if (glareScore < 0.3) {
    return 0.3;
  }

  if (glareScore < 0.6) {
    return 0.15;
  }

  return 0;
}

function countTokenOccurrences(
  attemptBuffer: Array<string | null>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const entry of attemptBuffer) {
    if (!entry) {
      continue;
    }

    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }

  return counts;
}

export function bufferContainsExactMatches(
  attemptBuffer: Array<string | null>,
  minMatches: number,
): boolean {
  for (const count of countTokenOccurrences(attemptBuffer).values()) {
    if (count >= minMatches) {
      return true;
    }
  }

  return false;
}

export function computeDominantTokenStabilityScore(
  attemptBuffer: Array<string | null>,
  bufferSize: number,
  glareScore: number | null,
): TokenStabilityScore | null {
  const counts = countTokenOccurrences(attemptBuffer);
  if (counts.size === 0) {
    return null;
  }

  let leading: { token: string; count: number } | null = null;
  for (const [token, count] of counts) {
    if (!leading || count > leading.count) {
      leading = { token, count };
    }
  }

  if (!leading) {
    return null;
  }

  const decodeVarianceIndex = computeDecodeVarianceIndex(attemptBuffer);
  const varianceClass = classifyDecodeVariance(decodeVarianceIndex);
  const matchFrequencyWeight = leading.count / bufferSize;
  const decodeStabilityWeight = computeDecodeStabilityWeight(varianceClass);
  const lightingQualityWeight = computeLightingQualityWeight(glareScore);
  const score =
    matchFrequencyWeight + decodeStabilityWeight + lightingQualityWeight;

  return {
    token: leading.token,
    count: leading.count,
    score,
    matchFrequencyWeight,
    decodeStabilityWeight,
    lightingQualityWeight,
    varianceClass,
    glareScore,
  };
}

export function evaluateQrConfirmation(
  attemptBuffer: Array<string | null>,
  bufferSize: number,
  glareScore: number | null,
): {
  shouldConfirm: boolean;
  dominant: TokenStabilityScore | null;
  instantPath: boolean;
} {
  const dominant = computeDominantTokenStabilityScore(
    attemptBuffer,
    bufferSize,
    glareScore,
  );

  if (!dominant || dominant.token.length === 0) {
    return { shouldConfirm: false, dominant: null, instantPath: false };
  }

  const instantPath = bufferContainsExactMatches(
    attemptBuffer,
    INSTANT_CONFIRM_MATCH_COUNT,
  );

  if (instantPath) {
    return { shouldConfirm: true, dominant, instantPath: true };
  }

  const shouldConfirm =
    dominant.score >= STABILITY_SCORE_THRESHOLD &&
    dominant.count >= MIN_WEIGHTED_CONFIRM_COUNT;

  return { shouldConfirm, dominant, instantPath: false };
}

function truncateTokenPreview(token: string, maxLength = 20): string {
  return `${token.slice(0, maxLength)}${token.length > maxLength ? "…" : ""}`;
}

export function qrScanHintMessage(hint: QrScanHint): string {
  return HINT_MESSAGES[hint];
}

/** Full-frame scan; omit shaded qrbox so the entire viewfinder is decoded. */
export function buildKioskQrCameraScanConfig(): Html5QrcodeCameraScanConfig {
  return {
    fps: 10,
    aspectRatio: 1,
    disableFlip: false,
    videoConstraints: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: { ideal: "environment" },
    },
  };
}

export function isVideoMeasurable(
  video: HTMLVideoElement | null | undefined,
): video is HTMLVideoElement {
  if (!video || !video.isConnected) {
    return false;
  }

  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return false;
  }

  return true;
}

export function getVideoFrameDimensions(video: HTMLVideoElement): {
  width: number;
  height: number;
} | null {
  if (!isVideoMeasurable(video)) {
    return null;
  }

  const width = video.clientWidth || video.videoWidth;
  const height = video.clientHeight || video.videoHeight;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

export function getQrScanRegions(
  frameWidth: number,
  frameHeight: number,
): QrScanRegion[] {
  const w = Math.max(1, Math.floor(frameWidth));
  const h = Math.max(1, Math.floor(frameHeight));

  return [
    { x: 0, y: 0, width: w, height: h, label: "full" },
    {
      x: Math.floor(w * 0.04),
      y: Math.floor(h * 0.04),
      width: Math.floor(w * 0.92),
      height: Math.floor(h * 0.92),
      label: "center-92",
    },
    {
      x: Math.floor(w * 0.12),
      y: Math.floor(h * 0.12),
      width: Math.floor(w * 0.76),
      height: Math.floor(h * 0.76),
      label: "center-76",
    },
  ];
}

function applyPreprocess(
  source: CanvasRenderingContext2D,
  target: CanvasRenderingContext2D,
  variant: FramePreprocessVariant,
) {
  const { width, height } = source.canvas;
  const imageData = source.getImageData(0, 0, width, height);
  const data = imageData.data;

  let brightnessOffset = 0;
  let contrastFactor = 1;

  switch (variant) {
    case "contrast":
      contrastFactor = 1.35;
      brightnessOffset = 8;
      break;
    case "bright":
      contrastFactor = 1.15;
      brightnessOffset = 28;
      break;
    default:
      break;
  }

  if (variant !== "normal") {
    for (let i = 0; i < data.length; i += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        const value = data[i + channel] ?? 0;
        let adjusted = (value - 128) * contrastFactor + 128 + brightnessOffset;
        adjusted = Math.max(0, Math.min(255, adjusted));
        data[i + channel] = adjusted;
      }
    }
    target.putImageData(imageData, 0, 0);
    return;
  }

  target.drawImage(source.canvas, 0, 0);
}

export function captureVideoRegionToCanvas(
  video: HTMLVideoElement,
  region: QrScanRegion,
  targetCanvas: HTMLCanvasElement,
  variant: FramePreprocessVariant = "normal",
): boolean {
  if (!isVideoMeasurable(video)) {
    return false;
  }

  const frame = getVideoFrameDimensions(video);
  if (!frame) {
    return false;
  }

  const scaleX = video.videoWidth / frame.width;
  const scaleY = video.videoHeight / frame.height;

  const sx = Math.floor(region.x * scaleX);
  const sy = Math.floor(region.y * scaleY);
  const sw = Math.max(1, Math.floor(region.width * scaleX));
  const sh = Math.max(1, Math.floor(region.height * scaleY));

  targetCanvas.width = sw;
  targetCanvas.height = sh;

  const rawContext = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (!rawContext) {
    return false;
  }

  rawContext.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

  if (variant === "normal") {
    return true;
  }

  const processedCanvas = document.createElement("canvas");
  processedCanvas.width = sw;
  processedCanvas.height = sh;
  const processedContext = processedCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!processedContext) {
    return true;
  }

  processedContext.drawImage(targetCanvas, 0, 0);
  applyPreprocess(processedContext, rawContext, variant);
  return true;
}

type CanvasQrDecoder = {
  decode: (canvas: HTMLCanvasElement) => Promise<string | null>;
  dispose: () => void;
};

type NativeBarcodeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function createNativeBarcodeDetector(): NativeBarcodeDetector | null {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return null;
  }

  const Detector = (
    window as Window & {
      BarcodeDetector?: new (options: { formats: string[] }) => NativeBarcodeDetector;
    }
  ).BarcodeDetector;

  if (!Detector) {
    return null;
  }

  return new Detector({ formats: ["qr_code"] });
}

function createCanvasQrDecoder(): CanvasQrDecoder {
  const barcodeDetector = createNativeBarcodeDetector();

  let fileDecoder: Html5Qrcode | null = null;
  let fileDecoderElement: HTMLDivElement | null = null;

  function ensureFileDecoder() {
    if (fileDecoder) {
      return fileDecoder;
    }

    fileDecoderElement = document.createElement("div");
    fileDecoderElement.id = `kiosk-qr-file-decoder-${Math.random().toString(36).slice(2)}`;
    fileDecoderElement.style.display = "none";
    document.body.appendChild(fileDecoderElement);

    fileDecoder = new Html5Qrcode(fileDecoderElement.id, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
    });

    return fileDecoder;
  }

  async function decodeWithFileFallback(
    canvas: HTMLCanvasElement,
  ): Promise<string | null> {
    const decoder = ensureFileDecoder();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/png");
    });

    if (!blob) {
      return null;
    }

    const file = new File([blob], "frame.png", { type: "image/png" });

    try {
      const result = await decoder.scanFileV2(file, false);
      return result.decodedText?.trim() || null;
    } catch {
      return null;
    }
  }

  return {
    async decode(canvas) {
      if (barcodeDetector) {
        try {
          const results = await barcodeDetector.detect(canvas);
          const text = results[0]?.rawValue?.trim();
          if (text) {
            return text;
          }
        } catch {
          // Fall through to file-based decoder.
        }
      }

      return decodeWithFileFallback(canvas);
    },
    dispose() {
      if (fileDecoder) {
        void fileDecoder.clear();
        fileDecoder = null;
      }
      fileDecoderElement?.remove();
      fileDecoderElement = null;
    },
  };
}

export type QrDecoderEngineOptions = {
  bufferSize?: number;
  minConsistentMatches?: number;
  retryHintIntervalMs?: number;
  onConfirmed: (token: string) => void;
  onHint?: (hint: QrScanHint, message: string) => void;
  onDebugUpdate?: (state: QrDecoderDebugState) => void;
};

export class QrDecoderEngine {
  private readonly bufferSize: number;
  private readonly minConsistentMatches: number;
  private readonly retryHintIntervalMs: number;
  private readonly onConfirmed: (token: string) => void;
  private readonly onHint?: (hint: QrScanHint, message: string) => void;
  private readonly onDebugUpdate?: (state: QrDecoderDebugState) => void;

  private readonly attemptBuffer: Array<string | null> = [];
  private confirmed = false;
  private decodeAttempts = 0;
  private successfulDecodes = 0;
  private framesCaptured = 0;
  private lastConfidence = 0;
  private lastRegion: string | null = null;
  private resolution: { width: number; height: number } | null = null;
  private hint: QrScanHint = "scanning";
  private hintTimer: number | null = null;
  private hintIndex = 0;
  private lastHintAt = 0;
  private fpsWindowStart = 0;
  private fpsFrameCount = 0;
  private cameraFps = 0;
  private frameCaptureRate = 0;
  private supplementalTimer: number | null = null;
  private supplementalAlive: (() => boolean) | null = null;
  private disposed = false;

  private readonly canvasDecoder = createCanvasQrDecoder();
  private readonly decodeCanvas = document.createElement("canvas");
  private supplementalBusy = false;
  private lastFrameLighting: QrFrameLightingEstimate | null = null;
  private lastInstrumentationLogAt = 0;
  private lastLightCheckLogAt = 0;

  constructor(options: QrDecoderEngineOptions) {
    this.bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;
    this.minConsistentMatches = options.minConsistentMatches ?? DEFAULT_MIN_CONSISTENT_MATCHES;
    this.retryHintIntervalMs =
      options.retryHintIntervalMs ?? DEFAULT_RETRY_HINT_INTERVAL_MS;
    this.onConfirmed = options.onConfirmed;
    this.onHint = options.onHint;
    this.onDebugUpdate = options.onDebugUpdate;

    this.emitHint("scanning");
    this.startHintRotation();
    this.pushDebug();
  }

  recordDecodeMiss(regionLabel?: string) {
    if (this.confirmed || this.disposed) {
      return;
    }

    this.decodeAttempts += 1;
    if (regionLabel) {
      this.lastRegion = regionLabel;
    }
    this.pushDebug();
  }

  ingestDecodeAttempt(rawToken: string, regionLabel?: string) {
    if (this.confirmed || this.disposed) {
      return;
    }

    this.decodeAttempts += 1;
    this.successfulDecodes += 1;
    if (regionLabel) {
      this.lastRegion = regionLabel;
    }

    const token = normalizeQrToken(rawToken);
    if (!token) {
      this.pushDebug();
      return;
    }

    this.attemptBuffer.push(token);
    if (this.attemptBuffer.length > this.bufferSize) {
      this.attemptBuffer.shift();
    }

    const leading = this.getLeadingToken();
    const confidence = leading ? leading.count / this.attemptBuffer.length : 0;
    this.lastConfidence = confidence;
    this.updateStabilityHints();
    this.pushDebug();

    const glareScore = computeGlareScore(this.lastFrameLighting);
    const evaluation = evaluateQrConfirmation(
      this.attemptBuffer,
      this.bufferSize,
      glareScore,
    );

    if (evaluation.shouldConfirm && evaluation.dominant) {
      const { dominant, instantPath } = evaluation;

      if (isQrDebugMode()) {
        console.log("[QR STABILITY]", {
          token: truncateTokenPreview(dominant.token, 24),
          score: Number(dominant.score.toFixed(3)),
          count: dominant.count,
          variance: dominant.varianceClass,
          glareScore: dominant.glareScore,
          lightingQualityWeight: dominant.lightingQualityWeight,
          instantPath,
        });
      }

      this.confirmed = true;
      this.stopHintRotation();
      appendKioskQrDebugEvent("QR DECODER", "confirmed", {
        matches: dominant.count,
        frames: this.attemptBuffer.length,
        confirmed: this.confirmed,
        decodeAttempts: this.decodeAttempts,
        confirmationProgress: dominant.score / STABILITY_SCORE_THRESHOLD,
        stabilityScore: Number(dominant.score.toFixed(3)),
        instantPath,
        matchFrequencyWeight: Number(dominant.matchFrequencyWeight.toFixed(3)),
        decodeStabilityWeight: Number(dominant.decodeStabilityWeight.toFixed(3)),
        lightingQualityWeight: Number(
          dominant.lightingQualityWeight.toFixed(3),
        ),
        varianceClass: dominant.varianceClass,
        dominantTokenConfidence: Number(confidence.toFixed(2)),
      });
      this.onConfirmed(dominant.token);
    }
  }

  recordFrameCaptured(resolution?: { width: number; height: number }) {
    if (this.disposed) {
      return;
    }

    this.framesCaptured += 1;
    this.fpsFrameCount += 1;

    if (resolution) {
      this.resolution = resolution;
    }

    const now = performance.now();
    if (this.fpsWindowStart === 0) {
      this.fpsWindowStart = now;
    }

    const elapsed = now - this.fpsWindowStart;
    if (elapsed >= 1000) {
      this.cameraFps = Math.round((this.fpsFrameCount * 1000) / elapsed);
      this.frameCaptureRate = this.cameraFps;
      this.fpsFrameCount = 0;
      this.fpsWindowStart = now;
      this.pushDebug();
    }
  }

  startSupplementalDecodeLoop(
    video: HTMLVideoElement,
    isAlive?: () => boolean,
  ) {
    this.stopSupplementalDecodeLoop();
    this.supplementalAlive = isAlive ?? null;

    const tick = () => {
      if (this.disposed || this.confirmed || !this.isSupplementalContextAlive(video)) {
        return;
      }

      void this.runSupplementalPass(video).finally(() => {
        if (
          !this.disposed &&
          !this.confirmed &&
          this.isSupplementalContextAlive(video)
        ) {
          this.supplementalTimer = window.setTimeout(tick, 80);
        }
      });
    };

    this.supplementalTimer = window.setTimeout(tick, 120);
  }

  stopSupplementalDecodeLoop() {
    if (this.supplementalTimer !== null) {
      window.clearTimeout(this.supplementalTimer);
      this.supplementalTimer = null;
    }
    this.supplementalAlive = null;
  }

  reset() {
    this.confirmed = false;
    this.attemptBuffer.length = 0;
    this.decodeAttempts = 0;
    this.successfulDecodes = 0;
    this.framesCaptured = 0;
    this.lastConfidence = 0;
    this.lastRegion = null;
    this.hintIndex = 0;
    this.emitHint("scanning");
    this.pushDebug();
  }

  dispose() {
    this.disposed = true;
    this.stopHintRotation();
    this.stopSupplementalDecodeLoop();
    this.canvasDecoder.dispose();
  }

  getDebugState(): QrDecoderDebugState {
    const leading = this.getLeadingToken();
    const frameRejections = Math.max(
      0,
      this.decodeAttempts - this.successfulDecodes,
    );
    const failedDecodeRatio =
      this.decodeAttempts > 0 ? frameRejections / this.decodeAttempts : 0;
    const leadingMatchCount = leading?.count ?? 0;
    const confirmationProgress = leadingMatchCount / this.minConsistentMatches;
    const decodeVarianceIndex = computeDecodeVarianceIndex(this.attemptBuffer);
    const glareScore = computeGlareScore(this.lastFrameLighting);
    const contrastScore =
      this.lastFrameLighting === null
        ? null
        : Math.min(1, this.lastFrameLighting.contrastEstimate / 128);

    const baseState: QrDecoderDebugState = {
      cameraFps: this.cameraFps,
      frameCaptureRate: this.frameCaptureRate,
      decodeAttempts: this.decodeAttempts,
      successfulDecodes: this.successfulDecodes,
      lastConfidence: this.lastConfidence,
      dominantTokenConfidence: this.lastConfidence,
      resolution: this.resolution,
      bufferFill: this.attemptBuffer.length,
      leadingTokenPreview: leading?.token
        ? truncateTokenPreview(leading.token, 24)
        : null,
      recentTokenPreviews: this.attemptBuffer
        .filter((entry): entry is string => Boolean(entry))
        .slice(-5)
        .reverse()
        .map((token) => truncateTokenPreview(token)),
      lastRegion: this.lastRegion,
      frameRejections,
      failedDecodeRatio,
      leadingMatchCount,
      confirmationProgress,
      confirmed: this.confirmed,
      lightingHint: "UNCLEAR" as QrLightingHint,
      brightnessLevel: this.lastFrameLighting?.brightnessLevel ?? null,
      contrastEstimate: this.lastFrameLighting?.contrastEstimate ?? null,
      frameSharpness: this.lastFrameLighting?.frameSharpness ?? null,
      glareDetected: this.lastFrameLighting?.glareDetected ?? null,
      lowLight: this.lastFrameLighting?.lowLight ?? null,
      glareScore,
      contrastScore,
      decodeVarianceIndex,
      decodeStability: "LOW",
      confirmMode: getQrConfirmMode(),
    };

    baseState.lightingHint = inferLightingHintFromDecoder(
      baseState,
      this.lastFrameLighting,
    );
    baseState.decodeStability = inferDecodeStability(baseState);

    return baseState;
  }

  private isSupplementalContextAlive(video: HTMLVideoElement): boolean {
    if (this.disposed) {
      return false;
    }

    if (this.supplementalAlive && !this.supplementalAlive()) {
      return false;
    }

    return isVideoMeasurable(video);
  }

  private async runSupplementalPass(video: HTMLVideoElement) {
    if (
      this.supplementalBusy ||
      this.confirmed ||
      !this.isSupplementalContextAlive(video)
    ) {
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    this.supplementalBusy = true;

    try {
      const frame = getVideoFrameDimensions(video);
      if (!frame) {
        return;
      }

      const { width: frameWidth, height: frameHeight } = frame;
      this.recordFrameCaptured({
        width: video.videoWidth,
        height: video.videoHeight,
      });

      const regions = getQrScanRegions(frameWidth, frameHeight);
      const variants: FramePreprocessVariant[] = ["normal", "contrast", "bright"];

      for (const region of regions) {
        for (const variant of variants) {
          if (this.confirmed || !this.isSupplementalContextAlive(video)) {
            return;
          }

          const captured = captureVideoRegionToCanvas(
            video,
            region,
            this.decodeCanvas,
            variant,
          );
          if (!captured) {
            continue;
          }

          if (variant === "normal" && region.label === "full") {
            this.lastFrameLighting = estimateCanvasLighting(this.decodeCanvas);
            if (isQrDebugMode()) {
              const lightNow = performance.now();
              if (
                this.lastFrameLighting &&
                lightNow - this.lastLightCheckLogAt >= 2000
              ) {
                this.lastLightCheckLogAt = lightNow;
                appendKioskQrDebugEvent("QR DECODER", "light check", {
                  brightnessLevel: this.lastFrameLighting.brightnessLevel,
                  contrastEstimate: this.lastFrameLighting.contrastEstimate,
                  frameSharpness: this.lastFrameLighting.frameSharpness,
                  glareDetected: this.lastFrameLighting.glareDetected,
                  lowLight: this.lastFrameLighting.lowLight,
                  glareScore: this.getDebugState().glareScore,
                  contrastScore: this.getDebugState().contrastScore,
                });
              }
            }
          }

          const decoded = await this.canvasDecoder.decode(this.decodeCanvas);
          if (decoded) {
            this.ingestDecodeAttempt(
              decoded,
              `${region.label}:${variant}`,
            );
            if (this.confirmed) {
              return;
            }
          } else {
            this.recordDecodeMiss(`${region.label}:${variant}`);
          }
        }
      }
    } finally {
      this.supplementalBusy = false;
    }
  }

  private updateStabilityHints() {
    if (this.confirmed || this.disposed) {
      return;
    }

    const state = this.getDebugState();

    if (state.glareDetected && state.decodeAttempts >= 4) {
      this.emitHint("reduce-glare");
      return;
    }

    if (
      state.decodeVarianceIndex >= 0.5 &&
      state.lastConfidence < 0.5 &&
      state.successfulDecodes >= 2
    ) {
      this.emitHint("hold-for-scan");
      return;
    }

    if (state.lastConfidence > 0 && state.lastConfidence < 0.5) {
      this.emitHint("hold-for-scan");
    }
  }

  private getEffectiveHintInterval(): number {
    const variance = computeDecodeVarianceIndex(this.attemptBuffer);
    if (variance >= 0.5 || this.lastConfidence < 0.5) {
      return HIGH_VARIANCE_HINT_INTERVAL_MS;
    }

    return this.retryHintIntervalMs;
  }

  private getLeadingToken(): { token: string; count: number } | null {
    const counts = countTokenOccurrences(this.attemptBuffer);

    let best: { token: string; count: number } | null = null;
    for (const [token, count] of counts) {
      if (!best || count > best.count) {
        best = { token, count };
      }
    }

    return best;
  }

  private emitHint(hint: QrScanHint) {
    this.hint = hint;
    this.lastHintAt = Date.now();
    this.onHint?.(hint, qrScanHintMessage(hint));
  }

  private startHintRotation() {
    this.stopHintRotation();
    const cycle: QrScanHint[] = [
      "scanning",
      "hold-steady",
      "hold-for-scan",
      "move-closer",
      "retrying",
    ];

    const tick = () => {
      if (this.confirmed || this.disposed) {
        return;
      }

      const state = this.getDebugState();

      if (state.glareDetected && state.decodeAttempts >= 4) {
        this.emitHint("reduce-glare");
      } else if (
        state.decodeVarianceIndex >= 0.5 &&
        state.lastConfidence < 0.5
      ) {
        this.emitHint("hold-for-scan");
      } else if (this.lastConfidence >= 0.35) {
        this.emitHint("hold-steady");
      } else {
        this.hintIndex = (this.hintIndex + 1) % cycle.length;
        this.emitHint(cycle[this.hintIndex]!);
      }

      this.hintTimer = window.setTimeout(tick, this.getEffectiveHintInterval());
    };

    this.hintTimer = window.setTimeout(tick, this.getEffectiveHintInterval());
  }

  private stopHintRotation() {
    if (this.hintTimer !== null) {
      window.clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
  }

  private pushDebug() {
    if (!isQrDebugMode() || this.disposed) {
      return;
    }

    const state = this.getDebugState();
    this.onDebugUpdate?.(state);

    const now = performance.now();
    if (now - this.lastInstrumentationLogAt < 2000) {
      return;
    }
    this.lastInstrumentationLogAt = now;

    appendKioskQrDebugEvent("QR DECODER", "decoder stats", {
      matches: state.leadingMatchCount,
      frames: state.bufferFill,
      confirmed: state.confirmed,
      decodeAttempts: state.decodeAttempts,
      frameRejections: state.frameRejections,
      failedDecodeRatio: Number(state.failedDecodeRatio.toFixed(2)),
      confirmationProgress: Number(state.confirmationProgress.toFixed(2)),
      lastConfidence: Number(state.lastConfidence.toFixed(2)),
      dominantTokenConfidence: Number(state.dominantTokenConfidence.toFixed(2)),
      decodeVarianceIndex: Number(state.decodeVarianceIndex.toFixed(2)),
      decodeStability: state.decodeStability,
      glareScore:
        state.glareScore === null ? null : Number(state.glareScore.toFixed(2)),
      contrastScore:
        state.contrastScore === null
          ? null
          : Number(state.contrastScore.toFixed(2)),
      confirmMode: state.confirmMode,
      lightingHint: state.lightingHint,
    });
  }
}
