import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function SettingsTimeRange({
  startId,
  endId,
  startLabel,
  endLabel,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startError,
  endError,
  disabled,
}: {
  startId: string;
  endId: string;
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startError?: string;
  endError?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TimeField
        id={startId}
        label={startLabel}
        value={startValue}
        onChange={onStartChange}
        error={startError}
        disabled={disabled}
      />
      <TimeField
        id={endId}
        label={endLabel}
        value={endValue}
        onChange={onEndChange}
        error={endError}
        disabled={disabled}
      />
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "max-w-full tabular-nums",
          error && "border-red-300 focus-visible:ring-red-400",
        )}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
