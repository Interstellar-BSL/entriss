import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function SettingsNumberField({
  id,
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  error,
  disabled,
  suffix,
}: {
  id: string;
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  error?: string;
  disabled?: boolean;
  suffix?: string;
}) {
  function clamp(next: number) {
    return Math.min(max, Math.max(min, next));
  }

  function handleInputChange(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    onChange(clamp(parsed));
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {description ? (
        <p className="text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          aria-label={`Decrease ${label}`}
          className="h-9 w-9 shrink-0 px-0"
        >
          −
        </Button>
        <div className="relative max-w-[7rem] flex-1">
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.target.value)}
            className={cn(
              "text-center tabular-nums",
              suffix && "pr-10",
              error && "border-red-300 focus-visible:ring-red-400",
            )}
            aria-invalid={Boolean(error)}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--muted)]">
              {suffix}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          aria-label={`Increase ${label}`}
          className="h-9 w-9 shrink-0 px-0"
        >
          +
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
