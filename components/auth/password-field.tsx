"use client";

import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

function getPasswordStrength(password: string): {
  label: string;
  score: number;
} {
  if (!password) {
    return { label: "", score: 0 };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { label: "Weak", score: 1 };
  }

  if (score <= 3) {
    return { label: "Fair", score: 2 };
  }

  return { label: "Strong", score: 3 };
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled = false,
  required = false,
  minLength = 8,
  showStrength = false,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  showStrength?: boolean;
  error?: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(
    () => (showStrength ? getPasswordStrength(value) : { label: "", score: 0 }),
    [showStrength, value],
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted)] hover:text-[var(--foreground)]"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value ? (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full bg-[var(--border)]",
                  strength.score >= level && "bg-[var(--brand-primary)]",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--muted)]">{strength.label}</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
