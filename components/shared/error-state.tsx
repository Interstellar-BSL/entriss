import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-red-900">{title}</p>
      {message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
