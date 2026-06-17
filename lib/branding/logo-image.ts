const ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const MAX_OUTPUT_SIZE = 256;

export function isAcceptedLogoMimeType(type: string) {
  return ACCEPTED_MIME_TYPES.has(type);
}

export async function cropImageToSquareDataUrl(
  file: File,
  outputSize = MAX_OUTPUT_SIZE,
): Promise<string> {
  if (!isAcceptedLogoMimeType(file.type)) {
    throw new Error("Logo must be a PNG, JPEG, or WebP image.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = Math.floor((image.naturalWidth - side) / 2);
    const sy = Math.floor((image.naturalHeight - side) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare logo preview.");
    }

    context.drawImage(image, sx, sy, side, side, 0, 0, outputSize, outputSize);

    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(mimeType, 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image file."));
    image.src = src;
  });
}
