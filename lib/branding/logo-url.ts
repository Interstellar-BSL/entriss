const DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

export function isValidLogoUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }

  const trimmed = value.trim();

  if (DATA_URL_PATTERN.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
