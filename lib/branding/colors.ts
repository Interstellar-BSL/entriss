const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidHexColor(value: string | null | undefined): value is string {
  return Boolean(value && HEX_COLOR_PATTERN.test(value));
}

export function sanitizeHexColor(
  value: string | null | undefined,
  fallback: string,
): string {
  return isValidHexColor(value) ? value : fallback;
}

export function darkenHexColor(hex: string, factor = 0.88): string {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;

  const value = Number.parseInt(full, 16);
  const red = Math.max(0, Math.min(255, Math.floor(((value >> 16) & 255) * factor)));
  const green = Math.max(0, Math.min(255, Math.floor(((value >> 8) & 255) * factor)));
  const blue = Math.max(0, Math.min(255, Math.floor((value & 255) * factor)));

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
